/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesTelemetrySchema, Long, CountSchema } from './types';

const long: Long = { type: 'long' };

const countSchema: CountSchema = {
  total: long,
  '1m': long,
  '1w': long,
  '1d': long,
};

export const casesSchema: CasesTelemetrySchema = {
  cases: {
    all: countSchema,
    sec: countSchema,
    obs: countSchema,
    main: countSchema,
    syncAlertsOn: long,
    syncAlertsOff: long,
  },
  userActions: { all: countSchema, maxOnACase: long },
  comments: { all: countSchema, maxOnACase: long },
  alerts: { all: countSchema, maxOnACase: long },
  connectors: {
    all: { totalAttached: long },
    itsm: { totalAttached: long },
    sir: { totalAttached: long },
    jira: { totalAttached: long },
    resilient: { totalAttached: long },
    swimlane: { totalAttached: long },
    maxAttachedToACase: long,
  },
  externalServices: {
    totalPushes: long,
    maxPushesOnACase: long,
  },
  configuration: {
    closure: {
      manually: long,
      automatic: long,
    },
  },
};
