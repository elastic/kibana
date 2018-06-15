/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';
import { parse as parseUrl } from 'url';


export class TMSSource extends ASource {

  constructor(options) {
    super();
    this._urlTemplate = options.urlTemplate;
  }

  getDisplayName() {
    const parsedUrl = parseUrl(this._urlTemplate);
    return parsedUrl.hostname;
  }

  async getUrlTemplate() {
    return this._urlTemplate;
  }
}
