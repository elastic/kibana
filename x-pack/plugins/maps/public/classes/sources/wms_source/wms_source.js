/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractTMSSource } from '../tms_source';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import { WmsClient } from './wms_client';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';

export const sourceTitle = i18n.translate('xpack.maps.source.wmsTitle', {
  defaultMessage: 'Web Map Service',
});

export class WMSSource extends AbstractTMSSource {
  static type = SOURCE_TYPES.WMS;

  static createDescriptor({ serviceUrl, layers, styles, attributionText, attributionUrl }) {
    return {
      type: WMSSource.type,
      serviceUrl,
      layers,
      styles,
      attributionText,
      attributionUrl,
    };
  }

  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.serviceUrl },
      {
        label: i18n.translate('xpack.maps.source.wms.layersLabel', {
          defaultMessage: 'Layers',
        }),
        value: this._descriptor.layers,
      },
      {
        label: i18n.translate('xpack.maps.source.wms.stylesLabel', {
          defaultMessage: 'Styles',
        }),
        value: this._descriptor.styles,
      },
    ];
  }

  async getDisplayName() {
    return this._descriptor.serviceUrl;
  }

  getAttributions() {
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

  getUrlTemplate() {
    const client = new WmsClient({ serviceUrl: this._descriptor.serviceUrl });
    return client.getUrlTemplate(this._descriptor.layers, this._descriptor.styles || '');
  }
}

registerSource({
  ConstructorFunction: WMSSource,
  type: SOURCE_TYPES.WMS,
});
