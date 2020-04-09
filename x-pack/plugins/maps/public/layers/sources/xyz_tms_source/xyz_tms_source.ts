/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TileLayer } from '../../tile_layer';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import { EMS_XYZ } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { AbstractTMSSource } from '../tms_source';
import { LayerDescriptor, XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { Attribution, ImmutableSourceProperty } from '../source';
import { SourceConfig } from './xyz_tms_editor';

export const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzTitle', {
  defaultMessage: 'Tile Map Service',
});

export class XYZTMSSource extends AbstractTMSSource {
  static type = EMS_XYZ;

  readonly _descriptor: XYZTMSSourceDescriptor;

  static createDescriptor({
    urlTemplate,
    attributionText,
    attributionUrl,
  }: SourceConfig): XYZTMSSourceDescriptor {
    return {
      type: XYZTMSSource.type,
      urlTemplate,
      attributionText,
      attributionUrl,
    };
  }

  constructor(sourceDescriptor: XYZTMSSourceDescriptor) {
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  async getImmutableProperties(): ImmutableSourceProperty[] {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
    ];
  }

  createDefaultLayer(options: LayerDescriptor): TileLayer {
    const layerDescriptor: LayerDescriptor = TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
    return new TileLayer({
      layerDescriptor,
      source: this,
    });
  }

  async getDisplayName(): string {
    return this._descriptor.urlTemplate;
  }

  async getAttributions(): Attribution[] {
    const { attributionText, attributionUrl } = this._descriptor;
    const attributionComplete = !!attributionText && !!attributionUrl;

    return attributionComplete
      ? [
          {
            url: attributionUrl,
            label: attributionText,
          },
        ]
      : [];
  }

  async getUrlTemplate(): string {
    return this._descriptor.urlTemplate;
  }
}

registerSource({
  ConstructorFunction: XYZTMSSource,
  type: EMS_XYZ,
});
