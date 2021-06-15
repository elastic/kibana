/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { getEmsTmsServices } from '../../../util';
import { UpdateSourceEditor } from './update_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { SOURCE_TYPES } from '../../../../common/constants';
import { getEmsTileLayerId, getIsDarkMode, getEMSSettings } from '../../../kibana_services';
import { registerSource } from '../source_registry';
import { getEmsUnavailableMessage } from '../../../components/ems_unavailable_message';
import { LICENSED_FEATURES } from '../../../licensed_features';

function getErrorInfo(emsTileLayerId) {
  return i18n.translate('xpack.maps.source.emsTile.unableToFindTileIdErrorMessage', {
    defaultMessage: `Unable to find EMS tile configuration for id: {id}. {info}`,
    values: { id: emsTileLayerId, info: getEmsUnavailableMessage() },
  });
}

export function getSourceTitle() {
  const emsSettings = getEMSSettings();
  if (emsSettings.isEMSUrlSet()) {
    return i18n.translate('xpack.maps.source.emsOnPremTileTitle', {
      defaultMessage: 'Elastic Maps Server Basemaps',
    });
  } else {
    return i18n.translate('xpack.maps.source.emsTileTitle', {
      defaultMessage: 'EMS Basemaps',
    });
  }
}

export class EMSTMSSource extends AbstractTMSSource {
  static createDescriptor(descriptor) {
    return {
      type: SOURCE_TYPES.EMS_TMS,
      id: descriptor.id,
      isAutoSelect:
        typeof descriptor.isAutoSelect !== 'undefined' ? !!descriptor.isAutoSelect : false,
    };
  }

  constructor(descriptor, inspectorAdapters) {
    descriptor = EMSTMSSource.createDescriptor(descriptor);
    super(descriptor, inspectorAdapters);
  }

  renderSourceSettingsEditor({ onChange }) {
    return <UpdateSourceEditor onChange={onChange} config={this._descriptor} />;
  }

  async getImmutableProperties() {
    const displayName = await this.getDisplayName();
    const autoSelectMsg = i18n.translate('xpack.maps.source.emsTile.isAutoSelectLabel', {
      defaultMessage: 'autoselect based on Kibana theme',
    });

    const props = [
      {
        label: getDataSourceLabel(),
        value: getSourceTitle(),
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.isAutoSelect ? `${displayName} - ${autoSelectMsg}` : displayName,
      },
    ];

    const emsSettings = getEMSSettings();
    if (emsSettings.isEMSUrlSet()) {
      props.push({
        label: i18n.translate('xpack.maps.source.emsTile.emsOnPremLabel', {
          defaultMessage: `Elastic Maps Server`,
        }),
        value: emsSettings.getEMSRoot(),
      });
    }

    return props;
  }

  async _getEMSTMSService() {
    let emsTMSServices;
    const emsTileLayerId = this.getTileLayerId();
    try {
      emsTMSServices = await getEmsTmsServices();
    } catch (e) {
      throw new Error(`${getErrorInfo(emsTileLayerId)} - ${e.message}`);
    }
    const tmsService = emsTMSServices.find((tmsService) => tmsService.getId() === emsTileLayerId);
    if (tmsService) {
      return tmsService;
    }

    throw new Error(getErrorInfo(emsTileLayerId));
  }

  async getDisplayName() {
    try {
      const emsTMSService = await this._getEMSTMSService();
      return emsTMSService.getDisplayName();
    } catch (error) {
      return this.getTileLayerId();
    }
  }

  getAttributionProvider() {
    return async () => {
      const emsTMSService = await this._getEMSTMSService();
      const markdown = emsTMSService.getMarkdownAttribution();
      if (!markdown) {
        return [];
      }
      return this.convertMarkdownLinkToObjectArr(markdown);
    };
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

  async getLicensedFeatures() {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() ? [LICENSED_FEATURES.ON_PREM_EMS] : [];
  }
}

registerSource({
  ConstructorFunction: EMSTMSSource,
  type: SOURCE_TYPES.EMS_TMS,
});
