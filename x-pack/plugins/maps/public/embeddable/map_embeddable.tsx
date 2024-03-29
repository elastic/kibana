/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import fastIsEqual from 'fast-deep-equal';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subscription } from 'rxjs';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { Query } from '@kbn/es-query';
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
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import {
  replaceLayerList,
  setMapSettings,
  setQuery,
  setReadOnly,
  setEmbeddableSearchContext,
  setExecutionContext,
} from '../actions';
import {
  getInspectorAdapters,
  setChartsPaletteServiceGetColor,
  setEventHandlers,
  EventHandlers,
} from '../reducers/non_serializable_instances';
import {
  getEmbeddableSearchContext,
  getLayerList,
  getQueryableUniqueIndexPatternIds,
  getLayerListRaw,
} from '../selectors/map_selectors';
import {
  APP_ID,
  getEditPath,
  getFullPath,
  MAP_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import {
  getCharts,
  getExecutionContextService,
  getHttp,
  getSearchService,
} from '../kibana_services';
import { LayerDescriptor, MapExtent } from '../../common/descriptor_types';
import { SavedMap } from '../routes/map_page';
import { getIndexPatternsFromIds } from '../index_pattern_util';

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

  private _savedMap: SavedMap;
  private _renderTooltipContent?: RenderToolTipContent;
  private _subscriptions: Subscription[] = [];
  private _prevIsRestore: boolean = false;
  private _prevSyncColors?: boolean;
  private _domNode?: HTMLElement;
  private _isInitialized = false;
  private _controlledBy: string;
  private _isSharable = true;

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

    this._savedMap = new SavedMap({ mapEmbeddableInput: initialInput });
    this._initializeSaveMap();
    this._subscriptions.push(this.getUpdated$().subscribe(() => this.onUpdate()));
    this._controlledBy = getControlledBy(this.id);
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

  public getLayerList() {
    return getLayerList(this._savedMap.getStore().getState());
  }

  public getFilters() {
    const embeddableSearchContext = getEmbeddableSearchContext(
      this._savedMap.getStore().getState()
    );
    return embeddableSearchContext ? embeddableSearchContext.filters : [];
  }

  public getQuery(): Query | undefined {
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
        clearTimeslice: this.input.timeslice === undefined,
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
    render(
      <div>Use react embeddable</div>,
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

  private async _getIndexPatterns() {
    const queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(
      this._savedMap.getStore().getState()
    );
    return await getIndexPatternsFromIds(queryableIndexPatternIds);
  }

  destroy() {
    super.destroy();

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
}
