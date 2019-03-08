/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { parseString } from 'xml2js';

export class WmsClient {
  constructor({ serviceUrl, version = '1.1.1' }) {
    this.serviceUrl = serviceUrl;
    this.version = version;
  }

  async _fetch(url) {
    return window.fetch(url);
  }

  async _fetchCapabilities() {
    const resp = await this._fetch(`${this.serviceUrl}?version=${this.version}&request=GetCapabilities&service=WMS`);
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

  reduceLayers(path, layers) {
    const emptyCapabilities = {
      layers: [],
      styles: [],
    };
    function groupOption(groups, optionGroupName, optionLabel, optionValue) {
      if (!optionLabel) {
        return groups;
      }

      const newOption = { label: optionLabel, value: optionValue };
      const matchingGroup = groups.find(group => {
        return group.label === optionGroupName;
      });

      // no matching group found, create new group
      if (!matchingGroup) {
        const newGroup = {
          label: optionGroupName,
          options: [newOption]
        };
        return [...groups, newGroup];
      }

      // add option to matching group
      matchingGroup.options.push(newOption);
      return [...groups];
    }

    return layers.reduce((accumulatedCapabilities, layer) => {
      // Layer is hierarchical, continue traversing
      if (layer.Layer) {
        const hierarchicalCapabilities  = this.reduceLayers([...path, layer.Title], layer.Layer);
        return {
          layers: [...accumulatedCapabilities.layers, ...hierarchicalCapabilities.layers],
          styles: [...accumulatedCapabilities.styles, ...hierarchicalCapabilities.styles]
        };
      }

      return {
        layers: groupOption(
          accumulatedCapabilities.layers,
          path.join(' - '),
          layer.Title[0],
          layer.Name[0]),
        styles: groupOption(
          accumulatedCapabilities.styles,
          path.join(' - '),
          _.get(layer, 'Style[0].Title[0]'),
          _.get(layer, 'Style[0].Name[0]'))
      };
    }, emptyCapabilities);
  }

  async getCapabilities() {
    const rawCapabilities = await this._fetchCapabilities();

    return this.reduceLayers([], _.get(rawCapabilities, 'WMT_MS_Capabilities.Capability[0].Layer', []));
  }


}
