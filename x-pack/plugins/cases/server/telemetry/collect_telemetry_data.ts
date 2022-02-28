/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesTelemetry } from './types';

export const collectTelemetryData = async (): Promise<CasesTelemetry> => {
  return {
    cases: {
      all: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
      sec: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
      obs: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
      main: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
      syncAlertsOn: 0,
      syncAlertsOff: 0,
    },
    userActions: { all: { all: 0, '1d': 0, '1w': 0, '1m': 0 }, maxOnACase: 0 },
    comments: { all: { all: 0, '1d': 0, '1w': 0, '1m': 0 }, maxOnACase: 0 },
    alerts: { all: { all: 0, '1d': 0, '1w': 0, '1m': 0 }, maxOnACase: 0 },
    connectors: {
      maxAttachedToACase: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
      itsm: { totalAttached: 0 },
      sir: { totalAttached: 0 },
      jira: { totalAttached: 0 },
      ibm: { totalAttached: 0 },
      swimlane: { totalAttached: 0 },
    },
    externalServices: {
      totalPushes: 0,
      maxPushesOnACase: 0,
    },
    configuration: {
      closeCaseAfterPush: 0,
    },
  };
};
