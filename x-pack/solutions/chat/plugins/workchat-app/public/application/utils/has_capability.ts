/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { WORKCHAT_FEATURE_ID } from '../../../common/features';

export const hasWorkchatCapability = (
  capabilities: ApplicationStart['capabilities'],
  capability: string
) => {
  const workchatCaps = capabilities[WORKCHAT_FEATURE_ID] ?? {};
  return workchatCaps[capability] === true;
};
