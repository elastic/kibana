/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin } from 'src/core/public';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  setup({ getStartServices }: CoreSetup<{}, {}>) {
    return {};
  }

  start() {
    return {};
  }
}
