/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsTelemetryData } from './queries/alerts';
import { getCasesTelemetryData } from './queries/cases';
import { getUserCommentsTelemetryData } from './queries/comments';
import { getConfigurationTelemetryData } from './queries/configuration';
import { getConnectorsTelemetryData } from './queries/connectors';
import { getPushedTelemetryData } from './queries/pushes';
import { getUserActionsTelemetryData } from './queries/user_actions';
import { CasesTelemetry, CollectTelemetryDataParams } from './types';

export const collectTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<Partial<CasesTelemetry>> => {
  try {
    const [cases, userActions, comments, alerts, connectors, pushes, configuration] =
      await Promise.all([
        getCasesTelemetryData({ savedObjectsClient, logger }),
        getUserActionsTelemetryData({ savedObjectsClient, logger }),
        getUserCommentsTelemetryData({ savedObjectsClient, logger }),
        getAlertsTelemetryData({ savedObjectsClient, logger }),
        getConnectorsTelemetryData({ savedObjectsClient, logger }),
        getPushedTelemetryData({ savedObjectsClient, logger }),
        getConfigurationTelemetryData({ savedObjectsClient, logger }),
      ]);

    return {
      cases,
      userActions,
      comments,
      alerts,
      connectors,
      pushes,
      configuration,
    };
  } catch (err) {
    logger.debug('Failed collecting Cases telemetry data');
    logger.debug(err);
    /**
     * Return an empty object instead of an empty state to distinguish between
     * clusters that they do not use cases thus all counts will be zero
     * and clusters where an error occurred.
     *  */

    return {};
  }
};
