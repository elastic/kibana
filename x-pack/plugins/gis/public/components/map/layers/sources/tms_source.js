/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';

export class TMSSource extends ASource {

  constructor() {
    super();
  }

  static create(options) {
    const tmsDescriptor = super.create(options);
    return tmsDescriptor;
  }
}
