/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule } from '../../types';
import { RulesClientContext } from '../types';

export function updateMeta<T extends Partial<RawRule>>(
  context: RulesClientContext,
  alertAttributes: T
): T {
  if (alertAttributes.hasOwnProperty('apiKey') || alertAttributes.hasOwnProperty('apiKeyOwner')) {
    alertAttributes.meta = alertAttributes.meta ?? {};
    alertAttributes.meta.versionApiKeyLastmodified = context.kibanaVersion;
  }
  return alertAttributes;
}
