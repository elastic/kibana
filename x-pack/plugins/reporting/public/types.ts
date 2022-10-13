/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';

export interface KibanaContext {
  http: CoreSetup['http'];
  application: CoreStart['application'];
  uiSettings: CoreStart['uiSettings'];
  docLinks: CoreStart['docLinks'];
}
