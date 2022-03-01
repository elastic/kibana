/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsTelemetryData } from './queries/alerts';
import { getCasesTelemetryData } from './queries/cases';
import { getUserCommentsTelemetryData } from './queries/comments';
import { getConnectorsTelemetryData } from './queries/connectors';
import { getUserActionsTelemetryData } from './queries/user_actions';
import { CasesTelemetry, CollectTelemetryDataParams } from './types';

export const collectTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry> => {
  const [cases, userActions, comments, alerts, connectors] = await Promise.all([
    getCasesTelemetryData({ savedObjectsClient }),
    getUserActionsTelemetryData({ savedObjectsClient }),
    getUserCommentsTelemetryData({ savedObjectsClient }),
    getAlertsTelemetryData({ savedObjectsClient }),
    getConnectorsTelemetryData({ savedObjectsClient }),
  ]);

  return {
    cases,
    userActions,
    comments,
    alerts,
    connectors,
    externalServices: {
      totalPushes: 0,
      maxPushesOnACase: 0,
    },
    configuration: {
      closeCaseAfterPush: 0,
    },
  };
};
