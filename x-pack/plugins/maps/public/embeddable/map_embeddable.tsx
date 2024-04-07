/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Embeddable,
  IContainer,
  ReferenceOrValueEmbeddable,
  VALUE_CLICK_TRIGGER,
  FilterableEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import {
  setEventHandlers,
  EventHandlers,
} from '../reducers/non_serializable_instances';
import { getLayerList } from '../selectors/map_selectors';
import { APP_ID, getEditPath, getFullPath, MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import { getHttp } from '../kibana_services';
import { SavedMap } from '../routes/map_page';

import {
  MapByValueInput,
  MapByReferenceInput,
  MapEmbeddableConfig,
  MapEmbeddableInput,
  MapEmbeddableOutput,
} from './types';

export class MapEmbeddable
  extends Embeddable<MapEmbeddableInput, MapEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<MapByValueInput, MapByReferenceInput>, FilterableEmbeddable
{
  type = MAP_SAVED_OBJECT_TYPE;
  deferEmbeddableLoad = true;

  private _savedMap: SavedMap;

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
    try {
      await this._initializeOutput();
    } catch (e) {
      this.onFatalError(e);
      return;
    }

    // deferred loading of this embeddable is complete
    this.setInitializationFinished();
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

  public supportedTriggers(): string[] {
    return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
  }

  setRenderTooltipContent = (renderTooltipContent: RenderToolTipContent) => {
    this._renderTooltipContent = renderTooltipContent;
  };

  setEventHandlers = (eventHandlers: EventHandlers) => {
    this._savedMap.getStore().dispatch(setEventHandlers(eventHandlers));
  };
}
