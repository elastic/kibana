/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export class SearchApiKeysPlugin implements Plugin<{}, {}> {
  public setup(core: CoreSetup): {} {
    return {};
  }

  public start(core: CoreStart): {} {
    return {};
  }

  public stop() {}
}
