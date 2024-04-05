/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subscription } from 'rxjs';
import type { PaletteRegistry } from '@kbn/coloring';
import { Query } from '@kbn/es-query';
import {
  Embeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
  VALUE_CLICK_TRIGGER,
  FilterableEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import {
  setEmbeddableSearchContext,
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
  getHttp,
} from '../kibana_services';
import { SavedMap } from '../routes/map_page';

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
  private _subscriptions: Subscription[] = [];
  private _prevSyncColors?: boolean;
  private _domNode?: HTMLElement;
  private _isInitialized = false;

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

    // deferred loading of this embeddable is complete
    this.setInitializationFinished();

    this._isInitialized = true;
    if (this._domNode) {
      this.render(this._domNode);
    }
  }

  private _initializeStore() {
    this._dispatchSetChartsPaletteServiceGetColor(this.input.syncColors);

    const store = this._savedMap.getStore();

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
    });
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

  getInspectorAdapters() {
    return getInspectorAdapters(this._savedMap.getStore().getState());
  }

  onUpdate() {
    if (this.input.syncColors !== this._prevSyncColors) {
      this._dispatchSetChartsPaletteServiceGetColor(this.input.syncColors);
    }
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

  destroy() {
    super.destroy();

    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }

    this._subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
  }
}