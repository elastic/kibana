/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
} from '../../../../src/plugins/maps_legacy/common';

export interface IEMSConfig {
  emsUrl?: string;
  includeElasticMapsService?: boolean;
  proxyElasticMapsServiceInMaps?: boolean;
  emsFileApiUrl?: string;
  emsTileApiUrl?: string;
  emsLandingPageUrl?: string;
  emsFontLibraryUrl?: string;
  isEMSEnabled?: boolean;
}

export class EMSSettings {
  private readonly _config: IEMSConfig;
  private readonly _getIsEnterprisePlus: () => boolean;

  constructor(config: IEMSConfig, getIsEnterPrisePlus: () => boolean) {
    this._config = config;
    this._getIsEnterprisePlus = getIsEnterPrisePlus;
  }

  _isEMSUrlSet() {
    return !!this._config.emsUrl;
  }

  _getEMSRoot() {
    return this._config.emsUrl!.replace(/\/$/, '');
  }

  isOnPrem(): boolean {
    return this._isEMSUrlSet();
  }

  isIncludeElasticMapsService() {
    return !!this._config.includeElasticMapsService;
  }

  isEMSEnabled(): boolean {
    if (this._isEMSUrlSet()) {
      return this._getIsEnterprisePlus();
    }
    return this.isIncludeElasticMapsService();
  }

  getEMSFileApiUrl(): string {
    if (this._config.emsFileApiUrl !== DEFAULT_EMS_FILE_API_URL || !this._isEMSUrlSet()) {
      return this._config.emsFileApiUrl!;
    } else {
      return `${this._getEMSRoot()}/file`;
    }
  }

  isProxyElasticMapsServiceInMaps(): boolean {
    return !!this._config.proxyElasticMapsServiceInMaps;
  }

  getEMSTileApiUrl(): string {
    if (this._config.emsTileApiUrl !== DEFAULT_EMS_TILE_API_URL || !this._isEMSUrlSet()) {
      return this._config.emsTileApiUrl!;
    } else {
      return `${this._getEMSRoot()}/tile`;
    }
  }
  getEMSLandingPageUrl(): string {
    if (this._config.emsLandingPageUrl !== DEFAULT_EMS_LANDING_PAGE_URL || !this._isEMSUrlSet()) {
      return this._config.emsLandingPageUrl!;
    } else {
      return `${this._getEMSRoot()}/maps`;
    }
  }

  getEMSFontLibraryUrl(): string {
    if (this._config.emsFontLibraryUrl !== DEFAULT_EMS_FONT_LIBRARY_URL || !this._isEMSUrlSet()) {
      return this._config.emsFontLibraryUrl!;
    } else {
      return `${this._getEMSRoot()}/tile/fonts/{fontstack}/{range}.pbf`;
    }
  }
}
