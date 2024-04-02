/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';
import { MAX_OPEN_CASES } from './constants';
import { TIME_WINDOW_REGEX } from '../../../common/constants';

const AlertSchema = schema.recordOf(schema.string(), schema.any(), {
  validate: (value) => {
    if (!Object.hasOwn(value, '_id') || !Object.hasOwn(value, '_index')) {
      return 'Alert ID and index must be defined';
    }
  },
});

/**
 * At the moment only one field is supported for grouping
 */
const GroupingSchema = schema.arrayOf(schema.string(), { minSize: 0, maxSize: 1 });

const RuleSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  ruleUrl: schema.nullable(schema.string()),
});

/**
 * The case connector does not have any configuration
 * or secrets.
 */
export const CasesConnectorConfigSchema = schema.object({});
export const CasesConnectorSecretsSchema = schema.object({});

export const CasesConnectorRunParamsSchema = schema.object({
  alerts: schema.arrayOf(AlertSchema),
  groupingBy: GroupingSchema,
  owner: schema.string(),
  rule: RuleSchema,
  timeWindow: schema.string({
    defaultValue: '7d',
    validate: (value) => {
      /**
       * Validates the time window.
       * Acceptable format:
       * - First character should be a digit from 1 to 9
       * - All next characters should be a digit from 0 to 9
       * - The last character should be d (day) or w (week) or M (month) or Y (year)
       *
       * Example: 20d, 2w, 1M, etc
       */
      const timeWindowRegex = new RegExp(TIME_WINDOW_REGEX, 'g');

      if (!timeWindowRegex.test(value)) {
        return 'Not a valid time window';
      }

      const date = dateMath.parse(`now-${value}`);

      if (!date || !date.isValid()) {
        return 'Not a valid time window';
      }
    },
  }),
  reopenClosedCases: schema.boolean({ defaultValue: false }),
  maximumCasesToOpen: schema.number({ defaultValue: 5, min: 1, max: MAX_OPEN_CASES }),
});
