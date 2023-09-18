/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { StartPlugins } from '../../../../../types';

export interface FleetUiExtensionGetterOptions {
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  services: {
    upsellingService: UpsellingService;
  };
}
