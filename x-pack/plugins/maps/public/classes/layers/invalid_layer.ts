/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { AbstractLayer } from './layer';
import { AbstractSource } from '../sources/source';
import { IStyle } from '../styles/style';

class InvalidSource extends AbstractSource {
  constructor(id?: string) {
    super({
      id,
      type: 'INVALID',
    });
  }
}

export class InvalidLayer extends AbstractLayer {
  private readonly _error: Error;
  private readonly _style: IStyle;

  constructor(layerDescriptor: LayerDescriptor, error: Error) {
    super({
      layerDescriptor,
      source: new InvalidSource(layerDescriptor.sourceDescriptor?.id),
    });
    this._error = error;
    this._style = {
      getType() {
        return 'INVALID';
      },
      renderEditor() {
        return null;
      },
    };
  }

  hasErrors() {
    return true;
  }

  getErrors() {
    return [
      {
        title: i18n.translate('xpack.maps.invalidLayer.errorTitle', {
          defaultMessage: `Unable to create layer`,
        }),
        body: this._error.message,
      },
    ];
  }

  getStyleForEditing() {
    return this._style;
  }

  getStyle() {
    return this._style;
  }

  getCurrentStyle() {
    return this._style;
  }

  getMbLayerIds() {
    return [];
  }

  ownsMbLayerId() {
    return false;
  }

  ownsMbSourceId() {
    return false;
  }

  syncLayerWithMB() {}

  getLayerTypeIconName() {
    return 'error';
  }
}
