/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { withLocale } from './config.base';

/*
 * These tests exist in a separate configuration because:
 * 1) The FTR does not support building and installing plugins against built Kibana.
 *    This test must be run against source only in order to build the fixture plugins.
 * 2) It provides a specific service to make EBT testing easier.
 * 3) The intention is to grow this suite as more developers use this feature.
 */
export default async function (ftrConfigProviderContext: FtrConfigProviderContext) {
  return withLocale(ftrConfigProviderContext, 'fr-FR');
}
