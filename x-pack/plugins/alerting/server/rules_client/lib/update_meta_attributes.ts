/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAttributes } from '../../data/rule/types';
import { RulesClientContext } from '../types';

export function updateMetaAttributes<T extends Partial<RuleAttributes>>(
  context: RulesClientContext,
  alertAttributes: T
): T {
  if (Object.hasOwn(alertAttributes, 'apiKey') || Object.hasOwn(alertAttributes, 'apiKeyOwner')) {
    return {
      ...alertAttributes,
      meta: {
        ...(alertAttributes.meta ?? {}),
        versionApiKeyLastmodified: context.kibanaVersion,
      },
    };
  }
  return alertAttributes;
}
