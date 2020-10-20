/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IStyle } from '../style';
import { StyleDescriptor } from '../../../../common/descriptor_types';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';

export class TileStyle implements IStyle {
  readonly _descriptor: StyleDescriptor;

  constructor() {
    this._descriptor = {
      type: LAYER_STYLE_TYPE.TILE,
    };
  }

  getType() {
    return LAYER_STYLE_TYPE.TILE;
  }

  renderEditor(/* { layer, onStyleDescriptorChange } */) {
    return null;
  }
}
