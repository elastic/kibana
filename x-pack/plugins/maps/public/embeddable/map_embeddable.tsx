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
  FilterableEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { APP_ID, getEditPath, getFullPath, MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
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
}
