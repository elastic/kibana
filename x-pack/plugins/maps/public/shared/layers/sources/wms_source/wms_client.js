/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { parseString } from 'xml2js';
import fetch from 'node-fetch';
import { parse, format } from 'url';

export class WmsClient {
  constructor({ serviceUrl }) {
    this._serviceUrl = serviceUrl;
  }

  async _fetch(url) {
    return fetch(url);
  }

  _createUrl(defaultQueryParams) {
    const serviceUrl = parse(this._serviceUrl, true);
    const queryParams = {
      ...serviceUrl.query,
      ...defaultQueryParams
    };
    return format({
      protocol: serviceUrl.protocol,
      hostname: serviceUrl.hostname,
      port: serviceUrl.port,
      pathname: serviceUrl.pathname,
      query: queryParams
    });
  }

  getUrlTemplate(layers, styles) {
    const urlTemplate = this._createUrl({
      format: 'image/png',
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      srs: 'EPSG:3857',
      transparent: 'true',
      width: '256',
      height: '256',
      layers,
      styles
    });
    //TODO Find a better way to avoid URL encoding the template braces
    return `${urlTemplate}&bbox={bbox-epsg-3857}`;
  }

  /**
   * Extend any query parameters supplied in the URL but override with required defaults
   * (ex. service must be WMS)
   */
  async _fetchCapabilities() {
    const getCapabilitiesUrl = parse(this._serviceUrl, true);
    const queryParams = {
      ...getCapabilitiesUrl.query,
      ...{
        version: '1.1.1',
        request: 'GetCapabilities',
        service: 'WMS'
      }
    };
    const resp = await this._fetch(format({
      protocol: getCapabilitiesUrl.protocol,
      hostname: getCapabilitiesUrl.hostname,
      port: getCapabilitiesUrl.port,
      pathname: getCapabilitiesUrl.pathname,
      query: queryParams
    }));
    if (resp.status >= 400) {
      throw new Error(`Unable to access ${this.state.serviceUrl}`);
    }
    const body = await resp.text();

    const parsePromise = new Promise((resolve, reject) => {
      parseString(body, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    return await parsePromise;
  }

  async getCapabilities() {
    const rawCapabilities = await this._fetchCapabilities();

    const { layers, styles } = reduceLayers([], _.get(rawCapabilities, 'WMT_MS_Capabilities.Capability[0].Layer', []));

    return {
      layers: groupCapabilities(layers),
      styles: groupCapabilities(styles)
    };
  }
}

function reduceLayers(path, layers) {
  const emptyCapabilities = {
    layers: [],
    styles: [],
  };
  function createOption(optionPath, optionTitle, optionName) {
    return {
      path: [...optionPath, optionTitle],
      value: optionName
    };
  }

  return layers.reduce((accumulatedCapabilities, layer) => {
    // Layer is hierarchical, continue traversing
    if (layer.Layer) {
      const hierarchicalCapabilities  = reduceLayers([...path, layer.Title[0]], layer.Layer);
      return {
        layers: [...accumulatedCapabilities.layers, ...hierarchicalCapabilities.layers],
        styles: [...accumulatedCapabilities.styles, ...hierarchicalCapabilities.styles]
      };
    }

    const updatedStyles = [...accumulatedCapabilities.styles];
    if (_.has(layer, 'Style[0]')) {
      updatedStyles.push(createOption(
        path,
        _.get(layer, 'Style[0].Title[0]'),
        _.get(layer, 'Style[0].Name[0]')
      ));
    }
    return {
      layers: [
        ...accumulatedCapabilities.layers,
        createOption(path, layer.Title[0], layer.Name[0])
      ],
      styles: updatedStyles
    };
  }, emptyCapabilities);
}

// Avoid filling select box option label with text that is all the same
// Create a single group from common parts of Layer hierarchy
function groupCapabilities(list) {
  if (list.length === 0) {
    return [];
  }

  let rootCommonPath = list[0].path;
  for(let listIndex = 1; listIndex < list.length; listIndex++) {
    if (rootCommonPath.length === 0) {
      // No commonality in root path, nothing left to verify
      break;
    }

    const path = list[listIndex].path;
    for(let pathIndex = 0; pathIndex < path.length && pathIndex < rootCommonPath.length; pathIndex++) {
      if (rootCommonPath[pathIndex] !== path[pathIndex]) {
        // truncate root common path at location of divergence
        rootCommonPath = rootCommonPath.slice(0, pathIndex);
        break;
      }
    }
  }

  if (rootCommonPath.length === 0 || list.length === 1) {
    return list.map(({ path, value }) => {
      return { label: path.join(' - '), value };
    });
  }

  return [{
    label: rootCommonPath.join(' - '),
    options: list.map(({ path, value }) => {
      return { label: path.splice(rootCommonPath.length).join(' - '), value };
    })
  }];
}
