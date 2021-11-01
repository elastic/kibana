/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbstractSource } from '../source';
import { getKibanaTileMap } from '../../../util';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import _ from 'lodash';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { extractAttributions } from './extract_attributions';

export const sourceTitle = i18n.translate('xpack.maps.source.kbnTMSTitle', {
  defaultMessage: 'Configured Tile Map Service',
});

export class KibanaTilemapSource extends AbstractSource {
  static type = SOURCE_TYPES.KIBANA_TILEMAP;

  static createDescriptor() {
    return {
      type: KibanaTilemapSource.type,
    };
  }

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.kbnTMS.urlLabel', {
          defaultMessage: 'Tilemap url',
        }),
        value: await this.getUrlTemplate(),
      },
    ];
  }

  async getUrlTemplate() {
    const tilemap = getKibanaTileMap();
    if (!tilemap.url) {
      throw new Error(
        i18n.translate('xpack.maps.source.kbnTMS.noConfigErrorMessage', {
          defaultMessage: `Unable to find map.tilemap.url configuration in the kibana.yml`,
        })
      );
    }
    return tilemap.url;
  }

  getAttributionProvider() {
    return async () => {
      const tilemap = getKibanaTileMap();
      const markdown = _.get(tilemap, 'options.attribution', '');
      return extractAttributions(markdown);
    };
  }

  async getDisplayName() {
    try {
      return await this.getUrlTemplate();
    } catch (e) {
      return '';
    }
  }
}

registerSource({
  ConstructorFunction: KibanaTilemapSource,
  type: SOURCE_TYPES.KIBANA_TILEMAP,
});
