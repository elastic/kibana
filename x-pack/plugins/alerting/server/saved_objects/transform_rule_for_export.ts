/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { RawAlert } from '../types';

export function transformRulesForExport(rules: SavedObject[]): Array<SavedObject<RawAlert>> {
  return rules.map((rule) => transformRuleForExport(rule as SavedObject<RawAlert>));
}

function transformRuleForExport(rule: SavedObject<RawAlert>): SavedObject<RawAlert> {
  return {
    ...rule,
    attributes: {
      ...rule.attributes,
      enabled: false,
      apiKey: null,
      apiKeyOwner: null,
      scheduledTaskId: null,
    },
  };
}
