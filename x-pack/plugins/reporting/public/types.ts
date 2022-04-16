/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, ApplicationStart, CoreSetup } from '@kbn/core/public';

export interface KibanaContext {
  http: HttpSetup;
  application: ApplicationStart;
  uiSettings: CoreSetup['uiSettings'];
}
