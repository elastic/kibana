/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesTelemetryData } from './queries/cases';
import { getUserActionsTelemetryData } from './queries/user_actions';
import { CasesTelemetry, CollectTelemetryDataParams } from './types';

export const collectTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry> => {
  const [cases, userActions] = await Promise.all([
    getCasesTelemetryData({ savedObjectsClient }),
    getUserActionsTelemetryData({ savedObjectsClient }),
  ]);

  return {
    cases,
    userActions,
    comments: { all: { total: 0, '1d': 0, '1w': 0, '1m': 0 }, maxOnACase: 0 },
    alerts: { all: { total: 0, '1d': 0, '1w': 0, '1m': 0 }, maxOnACase: 0 },
    connectors: {
      maxAttachedToACase: { total: 0, '1d': 0, '1w': 0, '1m': 0 },
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
