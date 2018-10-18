/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import fetch from 'node-fetch';
import URL from 'url-parse';

const extendUrl = (url, params) => {
  const parsed = new URL(url);
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      parsed.set(key, params[key]);
    }
  }
  return parsed.href;
};

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

const unescapeTemplateVars = url => {
  const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
  return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
};

const sanitizeHtml = x => x;//todo

/**
 * Adapted from service_settings. Consider refactor and include in Kibana OSS
 */
export class EMS_V2 {

  constructor(options) {
    this._queryParams = {
      my_app_version: options.kbnVersion,
      license: options.license
    };

    this._manifestServiceUrl = options.manifestServiceUrl;
    this._emsLandingPageUrl = options.emsLandingPageUrl;
  }


  async _loadCatalogue() {
    try {
      return await this._getManifest(this._manifestServiceUrl, this._queryParams);
    } catch (e) {
      if (!e) {
        e = new Error('Unknown error');
      }
      if (!(e instanceof Error)) {
        e = new Error(e || `status ${e.statusText || e.status}`);
      }
      throw new Error(`Could not retrieve manifest from the tile service: ${e.message}`);
    }
  }

  async _loadFileLayers() {

    const catalogue = await this._loadCatalogue();
    const fileService = catalogue.services.find(service => service.type === 'file');
    if (!fileService) {
      return [];
    }

    const manifest = await this._getManifest(fileService.manifest, this._queryParams);
    const layers = manifest.layers.filter(layer => layer.format === 'geojson' || layer.format === 'topojson');

    layers.forEach((layer) => {
      layer.url = this._extendUrlWithParams(layer.url);
      layer.attribution = sanitizeHtml(markdownIt.render(layer.attribution));
    });
    return layers;
  }

  async _loadTMSServices() {

    const catalogue = await this._loadCatalogue();
    const tmsService = catalogue.services.find((service) => service.type === 'tms');
    if (!tmsService) {
      return [];
    }
    const tmsManifest = await this._getManifest(tmsService.manifest, this._queryParams);
    return tmsManifest.services.map((tmsService) => {
      const preppedService = _.cloneDeep(tmsService);
      preppedService.attribution = sanitizeHtml(markdownIt.render(preppedService.attribution));
      preppedService.subdomains = preppedService.subdomains || [];
      preppedService.url = this._extendUrlWithParams(preppedService.url);
      return preppedService;
    });
  }

  _extendUrlWithParams(url) {
    const extended  = extendUrl(url, {
      query: this._queryParams
    });
    return unescapeTemplateVars(extended);
  }

  async _getManifest(manifestUrl) {
    const extendedUrl = extendUrl(manifestUrl, { query: this._queryParams });
    const response = await fetch(extendedUrl);
    return await response.json();
  }

  async getFileLayers() {
    return await this._loadFileLayers();
  }

  async getTMSServices() {
    return await this._loadTMSServices();
  }

  getEMSHotLink(fileLayer) {
    const id = `file/${fileLayer.name}`;
    return `${this._emsLandingPageUrl}#${id}`;
  }
}
