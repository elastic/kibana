/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { getEmsTmsServices } from '../../../meta';
import { UpdateSourceEditor } from './update_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { SOURCE_TYPES } from '../../../../common/constants';
import { getEmsTileLayerId, getIsDarkMode } from '../../../kibana_services';
import { registerSource } from '../source_registry';

export const sourceTitle = i18n.translate('xpack.maps.source.emsTileTitle', {
  defaultMessage: 'EMS Basemaps',
});

export class EMSTMSSource extends AbstractTMSSource {
  static type = SOURCE_TYPES.EMS_TMS;

  static createDescriptor(sourceConfig) {
    return {
      type: EMSTMSSource.type,
      id: sourceConfig.id,
      isAutoSelect: sourceConfig.isAutoSelect,
    };
  }

  constructor(descriptor, inspectorAdapters) {
    super(
      {
        id: descriptor.id,
        type: EMSTMSSource.type,
        isAutoSelect: _.get(descriptor, 'isAutoSelect', false),
      },
      inspectorAdapters
    );
  }

  renderSourceSettingsEditor({ onChange }) {
    return <UpdateSourceEditor onChange={onChange} config={this._descriptor} />;
  }

  async getImmutableProperties() {
    const displayName = await this.getDisplayName();
    const autoSelectMsg = i18n.translate('xpack.maps.source.emsTile.isAutoSelectLabel', {
      defaultMessage: 'autoselect based on Kibana theme',
    });

    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.isAutoSelect ? `${displayName} - ${autoSelectMsg}` : displayName,
      },
    ];
  }

  async _getEMSTMSService() {
    const emsTMSServices = await getEmsTmsServices();
    const emsTileLayerId = this.getTileLayerId();
    const tmsService = emsTMSServices.find((tmsService) => tmsService.getId() === emsTileLayerId);
    if (!tmsService) {
      throw new Error(
        i18n.translate('xpack.maps.source.emsTile.errorMessage', {
          defaultMessage: `Unable to find EMS tile configuration for id: {id}`,
          values: { id: emsTileLayerId },
        })
      );
    }
    return tmsService;
  }

  async getDisplayName() {
    try {
      const emsTMSService = await this._getEMSTMSService();
      return emsTMSService.getDisplayName();
    } catch (error) {
      return this.getTileLayerId();
    }
  }

  async getAttributions() {
    const emsTMSService = await this._getEMSTMSService();
    const markdown = emsTMSService.getMarkdownAttribution();
    if (!markdown) {
      return [];
    }
    return this.convertMarkdownLinkToObjectArr(markdown);
  }

  async getUrlTemplate() {
    const emsTMSService = await this._getEMSTMSService();
    return await emsTMSService.getUrlTemplate();
  }

  getSpriteNamespacePrefix() {
    return 'ems/' + this.getTileLayerId();
  }

  async getVectorStyleSheetAndSpriteMeta(isRetina) {
    const emsTMSService = await this._getEMSTMSService();
    const styleSheet = await emsTMSService.getVectorStyleSheet();
    const spriteMeta = await emsTMSService.getSpriteSheetMeta(isRetina);
    return {
      vectorStyleSheet: styleSheet,
      spriteMeta: spriteMeta,
    };
  }

  getTileLayerId() {
    if (!this._descriptor.isAutoSelect) {
      return this._descriptor.id;
    }

    const emsTileLayerId = getEmsTileLayerId();
    return getIsDarkMode() ? emsTileLayerId.dark : emsTileLayerId.bright;
  }
}

registerSource({
  ConstructorFunction: EMSTMSSource,
  type: SOURCE_TYPES.EMS_TMS,
});
