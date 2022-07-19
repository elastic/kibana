/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { AbstractStyleProperty } from './style_property';
import { LabelVisibilityStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';

export class LabelVisibilityProperty extends AbstractStyleProperty<LabelVisibilityStylePropertyDescriptor[options]> {
  private readonly _layerMinZoom: number;
  private readonly _layerMaxZoom: number;

  constructor(
    options: LabelVisibilityStylePropertyDescriptor[options],
    styleName: VECTOR_STYLES,
    layerMinZoom: number,
    layerMaxZoom: number,
  ) {
    super(options, styleName);
    this._layerMinZoom = layerMinZoom;
    this._layerMaxZoom = layerMaxZoom;
  }

  getLayerVisibility() {
    return { 
      max: this._layerMaxZoom,
      min: this._layerMinZoom
    };
  }

  getLabelVisibility() {
    const { useLayerVisibility, maxZoom, minZoom } = this.getOptions();
    return useLayerVisibility
      ? this.getLayerVisibility()
      : {
          max: Math.min(this._layerMaxZoom, maxZoom),
          min: Math.max(this._layerMinZoom, minZoom)
        };
  }
}
