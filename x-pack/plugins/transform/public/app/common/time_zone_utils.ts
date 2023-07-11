/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { isDefined } from '@kbn/ml-is-defined';

// Partial list of packages/core/ui-settings/core-ui-settings-common/src/timezones.ts
export const ACCEPTED_TIMEZONES = new Set([
  ...moment.tz
    .names()
    // We need to filter out some time zones, that moment.js knows about, but Elasticsearch
    // does not understand and would fail thus with a 400 bad request when using them.
    .filter((tz) => !['America/Nuuk', 'EST', 'HST', 'ROC', 'MST'].includes(tz)),
]);

export const isValidTimeZone = (arg?: unknown): arg is string =>
  isDefined(arg) && typeof arg === 'string' && ACCEPTED_TIMEZONES.has(arg);
