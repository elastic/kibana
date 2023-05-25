/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import React from 'react';
import { Provider } from 'react-redux';
import fastIsEqual from 'fast-deep-equal';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter as filterOperator,
  map,
  skip,
  startWith,
} from 'rxjs/operators';
import { Unsubscribe } from 'redux';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { EuiEmptyPrompt } from '@elastic/eui';
import { type Filter } from '@kbn/es-query';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  Embeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
  genericEmbeddableInputIsEqual,
  VALUE_CLICK_TRIGGER,
  omitGenericEmbeddableInput,
  FilterableEmbeddable,
  shouldFetch$,
} from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { createExtentFilter } from '../../common/elasticsearch_util';
import {
  replaceLayerList,
  setMapSettings,
  setQuery,
  setReadOnly,
  updateLayerById,
  setGotoWithCenter,
  setEmbeddableSearchContext,
  setExecutionContext,
} from '../actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getInspectorAdapters,
  setChartsPaletteServiceGetColor,
  setEventHandlers,
  setOnMapMove,
  EventHandlers,
} from '../reducers/non_serializable_instances';
import {
  isMapLoading,
  getGeoFieldNames,
  getEmbeddableSearchContext,
  getLayerList,
  getGoto,
  getMapCenter,
  getMapBuffer,
  getMapExtent,
  getMapReady,
  getMapSettings,
  getMapZoom,
  getHiddenLayerIds,
  getQueryableUniqueIndexPatternIds,
} from '../selectors/map_selectors';
import {
  APP_ID,
  getEditPath,
  getFullPath,
  MAP_SAVED_OBJECT_TYPE,
  RawValue,
  RENDER_TIMEOUT,
} from '../../common/constants';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import {
  getCharts,
  getCoreI18n,
  getExecutionContextService,
  getHttp,
  getSearchService,
  getSpacesApi,
  getTheme,
  getUiActions,
} from '../kibana_services';
import { LayerDescriptor, MapExtent } from '../../common/descriptor_types';
import { MapContainer } from '../connected_components/map_container';
import { SavedMap } from '../routes/map_page';
import { getIndexPatternsFromIds } from '../index_pattern_util';
import { getMapAttributeService } from '../map_attribute_service';
import { isUrlDrilldown, toValueClickDataFormat } from '../trigger_actions/trigger_utils';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { mapEmbeddablesSingleton } from './map_embeddables_singleton';
import { getGeoFieldsLabel } from './get_geo_fields_label';

import {
  MapByValueInput,
  MapByReferenceInput,
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableOutput,
} from './types';

async function getChartsPaletteServiceGetColor(): Promise<((value: string) => string) | null> {
  const chartsService = getCharts();
  const paletteRegistry: PaletteRegistry | null = chartsService
    ? await chartsService.palettes.getPalettes()
    : null;
  if (!paletteRegistry) {
    return null;
  }

  const paletteDefinition = paletteRegistry.get('default');
  const chartConfiguration = { syncColors: true };
  return (value: string) => {
    const series = [{ name: value, rankAtDepth: 0, totalSeriesAtDepth: 1 }];
    const color = paletteDefinition.getCategoricalColor(series, chartConfiguration);
    return color ? color : '#3d3d3d';
  };
}

function getIsRestore(searchSessionId?: string) {
  if (!searchSessionId) {
    return false;
  }
  const searchSessionOptions = getSearchService().session.getSearchOptions(searchSessionId);
  return searchSessionOptions ? searchSessionOptions.isRestore : false;
}

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

export class MapEmbeddable
  extends Embeddable<MapEmbeddableInput, MapEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<MapByValueInput, MapByReferenceInput>, FilterableEmbeddable
{
  type = MAP_SAVED_OBJECT_TYPE;
  deferEmbeddableLoad = true;

  private _isActive: boolean;
  private _savedMap: SavedMap;
  private _renderTooltipContent?: RenderToolTipContent;
  private _subscriptions: Subscription[] = [];
  private _prevIsRestore: boolean = false;
  private _prevMapExtent?: MapExtent;
  private _prevSyncColors?: boolean;
  private _domNode?: HTMLElement;
  private _unsubscribeFromStore?: Unsubscribe;
  private _isInitialized = false;
  private _controlledBy: string;
  private _isSharable = true;
  private readonly _onRenderComplete$;

  constructor(config: MapEmbeddableConfig, initialInput: MapEmbeddableInput, parent?: IContainer) {
    super(
      initialInput,
      {
        editApp: APP_ID,
        editable: config.editable,
        indexPatterns: [],
      },
      parent
    );

    this._isActive = true;
    this._savedMap = new SavedMap({ mapEmbeddableInput: initialInput });
    this._initializeSaveMap();
    this._subscriptions.push(this.getUpdated$().subscribe(() => this.onUpdate()));
    this._controlledBy = getControlledBy(this.id);

    this._onRenderComplete$ = this.getOutput$().pipe(
      // wrapping distinctUntilChanged with startWith and skip to prime distinctUntilChanged with an initial value.
      startWith(this.getOutput()),
      distinctUntilChanged((a, b) => a.loading === b.loading),
      skip(1),
      debounceTime(RENDER_TIMEOUT),
      filterOperator((output) => !output.loading),
      map(() => {
        // Observable notifies subscriber when rendering is complete
        // Return void to not expose internal implemenation details of observabale
        return;
      })
    );
  }

  public getOnRenderComplete$() {
    return this._onRenderComplete$;
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  private async _initializeSaveMap() {
    try {
      await this._savedMap.whenReady();
    } catch (e) {
      this.onFatalError(e);
      return;
    }
    this._initializeStore();
    try {
      await this._initializeOutput();
    } catch (e) {
      this.onFatalError(e);
      return;
    }

    this._savedMap.getStore().dispatch(setExecutionContext(this.getExecutionContext()));

    // deferred loading of this embeddable is complete
    this.setInitializationFinished();

    this._isInitialized = true;
    if (this._domNode) {
      this.render(this._domNode);
    }
  }

  private getExecutionContext() {
    const parentContext = getExecutionContextService().get();
    const mapContext: KibanaExecutionContext = {
      type: APP_ID,
      name: APP_ID,
      id: this.id,
      url: this.output.editPath,
    };

    return parentContext
      ? {
          ...parentContext,
          child: mapContext,
        }
      : mapContext;
  }

  private _initializeStore() {
    this._dispatchSetChartsPaletteServiceGetColor(this.input.syncColors);

    const store = this._savedMap.getStore();

    store.dispatch(setReadOnly(true));
    store.dispatch(
      setMapSettings({
        keydownScrollZoom: true,
        showTimesliderToggleButton: false,
      })
    );

    // Passing callback into redux store instead of regular pattern of getting redux state changes for performance reasons
    store.dispatch(setOnMapMove(this._propogateMapMovement));

    this._dispatchSetQuery({ forceRefresh: false });
    this._subscriptions.push(
      shouldFetch$<MapEmbeddableInput>(this.getUpdated$(), () => {
        return {
          ...this.getInput(),
          filters: this._getInputFilters(),
          searchSessionId: this._getSearchSessionId(),
        };
      }).subscribe(() => {
        this._dispatchSetQuery({
          forceRefresh: false,
        });
      })
    );

    const mapStateJSON = this._savedMap.getAttributes().mapStateJSON;
    if (mapStateJSON) {
      try {
        const mapState = JSON.parse(mapStateJSON);
        store.dispatch(
          setEmbeddableSearchContext({
            filters: mapState.filters ? mapState.filters : [],
            query: mapState.query,
          })
        );
      } catch (e) {
        // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
      }
    }

    this._unsubscribeFromStore = store.subscribe(() => {
      this._handleStoreChanges();
    });
  }

  private async _initializeOutput() {
    const { title: savedMapTitle, description: savedMapDescription } =
      this._savedMap.getAttributes();
    const input = this.getInput();
    const title = input.hidePanelTitles ? '' : input.title ?? savedMapTitle;
    const savedObjectId = 'savedObjectId' in input ? input.savedObjectId : undefined;
    this.updateOutput({
      defaultTitle: savedMapTitle,
      defaultDescription: savedMapDescription,
      title,
      editPath: getEditPath(savedObjectId),
      editUrl: getHttp().basePath.prepend(getFullPath(savedObjectId)),
      indexPatterns: await this._getIndexPatterns(),
    });
  }

  public inputIsRefType(
    input: MapByValueInput | MapByReferenceInput
  ): input is MapByReferenceInput {
    return getMapAttributeService().inputIsRefType(input);
  }

  public async getInputAsRefType(): Promise<MapByReferenceInput> {
    return getMapAttributeService().getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  }

  public async getExplicitInputIsEqual(
    lastExplicitInput: Partial<MapByValueInput | MapByReferenceInput>
  ): Promise<boolean> {
    const currentExplicitInput = this.getExplicitInput();
    if (!genericEmbeddableInputIsEqual(lastExplicitInput, currentExplicitInput)) return false;

    // generic embeddable input is equal, now we compare map specific input elements, ignoring 'mapBuffer'.
    const lastMapInput = omitGenericEmbeddableInput(_.omit(lastExplicitInput, 'mapBuffer'));
    const currentMapInput = omitGenericEmbeddableInput(_.omit(currentExplicitInput, 'mapBuffer'));
    return fastIsEqual(lastMapInput, currentMapInput);
  }

  public async getInputAsValueType(): Promise<MapByValueInput> {
    return getMapAttributeService().getInputAsValueType(this.getExplicitInput());
  }

  public getLayerList() {
    return getLayerList(this._savedMap.getStore().getState());
  }

  public async getFilters() {
    const embeddableSearchContext = getEmbeddableSearchContext(
      this._savedMap.getStore().getState()
    );
    return embeddableSearchContext ? embeddableSearchContext.filters : [];
  }

  public async getQuery() {
    const embeddableSearchContext = getEmbeddableSearchContext(
      this._savedMap.getStore().getState()
    );
    return embeddableSearchContext?.query;
  }

  public supportedTriggers(): string[] {
    return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
  }

  setRenderTooltipContent = (renderTooltipContent: RenderToolTipContent) => {
    this._renderTooltipContent = renderTooltipContent;
  };

  setEventHandlers = (eventHandlers: EventHandlers) => {
    this._savedMap.getStore().dispatch(setEventHandlers(eventHandlers));
  };

  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  public setIsSharable(isSharable: boolean): void {
    this._isSharable = isSharable;
  }

  getInspectorAdapters() {
    return getInspectorAdapters(this._savedMap.getStore().getState());
  }

  onUpdate() {
    if (this.input.syncColors !== this._prevSyncColors) {
      this._dispatchSetChartsPaletteServiceGetColor(this.input.syncColors);
    }

    const isRestore = getIsRestore(this._getSearchSessionId());
    if (isRestore !== this._prevIsRestore) {
      this._prevIsRestore = isRestore;
      this._savedMap.getStore().dispatch(
        setMapSettings({
          disableInteractive: isRestore,
          hideToolbarOverlay: isRestore,
        })
      );
    }
  }

  _getIsMovementSynchronized = () => {
    return this.input.isMovementSynchronized === undefined
      ? true
      : this.input.isMovementSynchronized;
  };

  _getIsFilterByMapExtent = () => {
    return this.input.filterByMapExtent === undefined ? false : this.input.filterByMapExtent;
  };

  _gotoSynchronizedLocation() {
    const syncedLocation = mapEmbeddablesSingleton.getLocation();
    if (syncedLocation) {
      // set map to synchronized view
      this._mapSyncHandler(syncedLocation.lat, syncedLocation.lon, syncedLocation.zoom);
      return;
    }

    if (!getMapReady(this._savedMap.getStore().getState())) {
      // Initialize synchronized view to map's goto
      // Use goto because un-rendered map will not have accurate mapCenter and mapZoom.
      const goto = getGoto(this._savedMap.getStore().getState());
      if (goto && goto.center) {
        mapEmbeddablesSingleton.setLocation(
          this.input.id,
          goto.center.lat,
          goto.center.lon,
          goto.center.zoom
        );
        return;
      }
    }

    // Initialize synchronized view to map's view
    const center = getMapCenter(this._savedMap.getStore().getState());
    const zoom = getMapZoom(this._savedMap.getStore().getState());
    mapEmbeddablesSingleton.setLocation(this.input.id, center.lat, center.lon, zoom);
  }

  _propogateMapMovement = (lat: number, lon: number, zoom: number) => {
    if (this._getIsMovementSynchronized()) {
      mapEmbeddablesSingleton.setLocation(this.input.id, lat, lon, zoom);
    }
  };

  _getInputFilters() {
    return this.input.filters
      ? this.input.filters.filter(
          (filter) => !filter.meta.disabled && filter.meta.controlledBy !== this._controlledBy
        )
      : [];
  }

  _getSearchSessionId() {
    // New search session id causes all layers from elasticsearch to refetch data.
    // Dashboard provides a new search session id anytime filters change.
    // Thus, filtering embeddable container by map extent causes a new search session id any time the map is moved.
    // Disabling search session when filtering embeddable container by map extent.
    // The use case for search sessions (restoring results because of slow responses) does not match the use case of
    // filtering by map extent (rapid responses as users explore their map).
    return this.input.filterByMapExtent ? undefined : this.input.searchSessionId;
  }

  _dispatchSetQuery({ forceRefresh }: { forceRefresh: boolean }) {
    this._savedMap.getStore().dispatch<any>(
      setQuery({
        filters: this._getInputFilters(),
        query: this.input.query,
        timeFilters: this.input.timeRange,
        timeslice: this.input.timeslice
          ? { from: this.input.timeslice[0], to: this.input.timeslice[1] }
          : undefined,
        forceRefresh,
        searchSessionId: this._getSearchSessionId(),
        searchSessionMapBuffer: getIsRestore(this._getSearchSessionId())
          ? this.input.mapBuffer
          : undefined,
      })
    );
  }

  async _dispatchSetChartsPaletteServiceGetColor(syncColors?: boolean) {
    this._prevSyncColors = syncColors;
    const chartsPaletteServiceGetColor = syncColors
      ? await getChartsPaletteServiceGetColor()
      : null;
    if (syncColors !== this._prevSyncColors) {
      return;
    }
    this._savedMap
      .getStore()
      .dispatch(setChartsPaletteServiceGetColor(chartsPaletteServiceGetColor));
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement) {
    this._domNode = domNode;
    if (!this._isInitialized) {
      return;
    }

    mapEmbeddablesSingleton.register(this.input.id, {
      getTitle: () => {
        const output = this.getOutput();
        if (output.title) {
          return output.title;
        }

        if (output.defaultTitle) {
          return output.defaultTitle;
        }

        return this.input.id;
      },
      onLocationChange: this._mapSyncHandler,
      getIsMovementSynchronized: this._getIsMovementSynchronized,
      setIsMovementSynchronized: (isMovementSynchronized: boolean) => {
        this.updateInput({ isMovementSynchronized });
        if (isMovementSynchronized) {
          this._gotoSynchronizedLocation();
        } else if (!isMovementSynchronized && this._savedMap.getAutoFitToBounds()) {
          // restore autoFitToBounds when isMovementSynchronized disabled
          this._savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: true }));
        }
      },
      getIsFilterByMapExtent: this._getIsFilterByMapExtent,
      setIsFilterByMapExtent: (isFilterByMapExtent: boolean) => {
        this.updateInput({ filterByMapExtent: isFilterByMapExtent });
        if (isFilterByMapExtent) {
          this._setMapExtentFilter();
        } else {
          this._clearMapExtentFilter();
        }
      },
      getGeoFieldNames: () => {
        return getGeoFieldNames(this._savedMap.getStore().getState());
      },
    });
    if (this._getIsMovementSynchronized()) {
      this._gotoSynchronizedLocation();
    }

    const sharingSavedObjectProps = this._savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    const content =
      sharingSavedObjectProps && spaces && sharingSavedObjectProps?.outcome === 'conflict' ? (
        <div className="mapEmbeddedError">
          <EuiEmptyPrompt
            iconType="warning"
            iconColor="danger"
            data-test-subj="embeddable-maps-failure"
            body={spaces.ui.components.getEmbeddableLegacyUrlConflict({
              targetType: MAP_SAVED_OBJECT_TYPE,
              sourceId: sharingSavedObjectProps.sourceId!,
            })}
          />
        </div>
      ) : (
        <MapContainer
          onSingleValueTrigger={this.onSingleValueTrigger}
          addFilters={
            this.input.hideFilterActions || this.input.disableTriggers ? null : this.addFilters
          }
          getFilterActions={this.getFilterActions}
          getActionContext={this.getActionContext}
          renderTooltipContent={this._renderTooltipContent}
          title={this.getTitle()}
          description={this.getDescription()}
          waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(this._savedMap.getStore())}
          isSharable={this._isSharable}
        />
      );

    const I18nContext = getCoreI18n().Context;
    render(
      <Provider store={this._savedMap.getStore()}>
        <I18nContext>
          <KibanaThemeProvider theme$={getTheme().theme$}>{content}</KibanaThemeProvider>
        </I18nContext>
      </Provider>,
      this._domNode
    );
  }

  setLayerList(layerList: LayerDescriptor[]) {
    this._savedMap.getStore().dispatch<any>(replaceLayerList(layerList));
    this._getIndexPatterns().then((indexPatterns) => {
      this.updateOutput({
        indexPatterns,
      });
    });
  }

  updateLayerById(layerDescriptor: LayerDescriptor) {
    this._savedMap.getStore().dispatch<any>(updateLayerById(layerDescriptor));
  }

  private async _getIndexPatterns() {
    const queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(
      this._savedMap.getStore().getState()
    );
    return await getIndexPatternsFromIds(queryableIndexPatternIds);
  }

  onSingleValueTrigger = (actionId: string, key: string, value: RawValue) => {
    const action = getUiActions().getAction(actionId);
    if (!action) {
      throw new Error('Unable to apply action, could not locate action');
    }
    const executeContext = {
      ...this.getActionContext(),
      data: {
        data: toValueClickDataFormat(key, value),
      },
    };
    action.execute(executeContext);
  };

  addFilters = async (filters: Filter[], actionId: string = ACTION_GLOBAL_APPLY_FILTER) => {
    const executeContext = {
      ...this.getActionContext(),
      filters,
    };
    const action = getUiActions().getAction(actionId);
    if (!action) {
      throw new Error('Unable to apply filter, could not locate action');
    }
    action.execute(executeContext);
  };

  getFilterActions = async () => {
    const filterActions = await getUiActions().getTriggerCompatibleActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      filters: [],
    });
    const valueClickActions = await getUiActions().getTriggerCompatibleActions(
      VALUE_CLICK_TRIGGER,
      {
        embeddable: this,
        data: {
          // uiActions.getTriggerCompatibleActions validates action with provided context
          // so if event.key and event.value are used in the URL template but can not be parsed from context
          // then the action is filtered out.
          // To prevent filtering out actions, provide dummy context when initially fetching actions.
          data: toValueClickDataFormat('anyfield', 'anyvalue'),
        },
      }
    );
    return [...filterActions, ...valueClickActions.filter(isUrlDrilldown)];
  };

  getActionContext = () => {
    const trigger = getUiActions().getTrigger(APPLY_FILTER_TRIGGER);
    if (!trigger) {
      throw new Error('Unable to get context, could not locate trigger');
    }
    return {
      embeddable: this,
      trigger,
    } as ActionExecutionContext;
  };

  // Timing bug for dashboard with multiple maps with synchronized movement and filter by map extent enabled
  // When moving map with filterByMapExtent:false, previous map extent filter(s) does not get removed
  // Cuased by syncDashboardContainerInput applyContainerChangesToState.
  //   1) _setMapExtentFilter executes ACTION_GLOBAL_APPLY_FILTER action,
  //      removing previous map extent filter and adding new map extent filter
  //   2) applyContainerChangesToState then re-adds stale input.filters (which contains previous map extent filter)
  // Add debounce to fix timing issue.
  //   1) applyContainerChangesToState now runs first and does its thing
  //   2) _setMapExtentFilter executes ACTION_GLOBAL_APPLY_FILTER action,
  //      removing previous map extent filter and adding new map extent filter
  _setMapExtentFilter = _.debounce(() => {
    const mapExtent = getMapExtent(this._savedMap.getStore().getState());
    const geoFieldNames = mapEmbeddablesSingleton.getGeoFieldNames();

    if (mapExtent === undefined || geoFieldNames.length === 0) {
      return;
    }

    this._prevMapExtent = mapExtent;

    const mapExtentFilter = createExtentFilter(mapExtent, geoFieldNames);
    mapExtentFilter.meta.controlledBy = this._controlledBy;
    mapExtentFilter.meta.alias = i18n.translate('xpack.maps.embeddable.boundsFilterLabel', {
      defaultMessage: '{geoFieldsLabel} within map bounds',
      values: { geoFieldsLabel: getGeoFieldsLabel(geoFieldNames) },
    });

    const executeContext = {
      ...this.getActionContext(),
      filters: [mapExtentFilter],
      controlledBy: this._controlledBy,
    };
    const action = getUiActions().getAction(ACTION_GLOBAL_APPLY_FILTER);
    if (!action) {
      throw new Error('Unable to apply map extent filter, could not locate action');
    }
    action.execute(executeContext);
  }, 100);

  _clearMapExtentFilter() {
    this._prevMapExtent = undefined;
    const executeContext = {
      ...this.getActionContext(),
      filters: [],
      controlledBy: this._controlledBy,
    };
    const action = getUiActions().getAction(ACTION_GLOBAL_APPLY_FILTER);
    if (!action) {
      throw new Error('Unable to apply map extent filter, could not locate action');
    }
    action.execute(executeContext);
  }

  destroy() {
    super.destroy();
    mapEmbeddablesSingleton.unregister(this.input.id);
    this._isActive = false;
    if (this._unsubscribeFromStore) {
      this._unsubscribeFromStore();
    }

    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }

    this._subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
  }

  reload() {
    this._dispatchSetQuery({
      forceRefresh: true,
    });
  }

  _mapSyncHandler = (lat: number, lon: number, zoom: number) => {
    // auto fit to bounds is not compatable with map synchronization
    // auto fit to bounds may cause map location to never stablize and bound back and forth between bounds on different maps
    if (getMapSettings(this._savedMap.getStore().getState()).autoFitToDataBounds) {
      this._savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: false }));
    }
    this._savedMap.getStore().dispatch(setGotoWithCenter({ lat, lon, zoom }));
  };

  _handleStoreChanges() {
    if (!this._isActive || !getMapReady(this._savedMap.getStore().getState())) {
      return;
    }

    const mapExtent = getMapExtent(this._savedMap.getStore().getState());
    if (this._getIsFilterByMapExtent() && !_.isEqual(this._prevMapExtent, mapExtent)) {
      this._setMapExtentFilter();
    }

    const center = getMapCenter(this._savedMap.getStore().getState());
    const zoom = getMapZoom(this._savedMap.getStore().getState());

    const mapCenter = this.input.mapCenter || undefined;
    if (
      !mapCenter ||
      mapCenter.lat !== center.lat ||
      mapCenter.lon !== center.lon ||
      mapCenter.zoom !== zoom
    ) {
      this.updateInput({
        mapCenter: {
          lat: center.lat,
          lon: center.lon,
          zoom,
        },
        mapBuffer: getMapBuffer(this._savedMap.getStore().getState()),
      });
    }

    const isLayerTOCOpen = getIsLayerTOCOpen(this._savedMap.getStore().getState());
    if (this.input.isLayerTOCOpen !== isLayerTOCOpen) {
      this.updateInput({
        isLayerTOCOpen,
      });
    }

    const openTOCDetails = getOpenTOCDetails(this._savedMap.getStore().getState());
    if (!_.isEqual(this.input.openTOCDetails, openTOCDetails)) {
      this.updateInput({
        openTOCDetails,
      });
    }

    const hiddenLayerIds = getHiddenLayerIds(this._savedMap.getStore().getState());
    if (!_.isEqual(this.input.hiddenLayers, hiddenLayerIds)) {
      this.updateInput({
        hiddenLayers: hiddenLayerIds,
      });
    }

    const isLoading = isMapLoading(this._savedMap.getStore().getState());
    if (this.getOutput().loading !== isLoading) {
      /**
       * Maps emit rendered when the data is loaded, as we don't have feedback from the maps rendering library atm.
       * This means that the DASHBOARD_LOADED_EVENT event might be fired while a map is still rendering in some cases.
       * For more details please contact the maps team.
       */
      this.updateOutput({
        loading: isLoading,
        rendered: !isLoading,
        // do not surface layer errors as output.error
        // output.error blocks entire embeddable display and prevents map from displaying
        // layer errors are better surfaced in legend while still keeping the map usable
      });
    }
  }
}
