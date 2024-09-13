/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';

export const openAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-open`;
export const acknowledgedAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}- acknowledged`;
export const closedAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-closed`;

export const useAlertsByStatusVisualizationData = () => {
  const { responses: openAlertsResponses } = useVisualizationResponse({
    visualizationId: openAlertsVisualizationId,
  });

  const { responses: acknowledgedAlertsResponses } = useVisualizationResponse({
    visualizationId: acknowledgedAlertsVisualizationId,
  });

  const { responses: closedAlertsResponses } = useVisualizationResponse({
    visualizationId: closedAlertsVisualizationId,
  });

  const visualizationOpenAlertsData =
    openAlertsResponses != null ? openAlertsResponses[0].hits.total : 0;
  const visualizationAcknowledgedAlertsData =
    acknowledgedAlertsResponses != null ? acknowledgedAlertsResponses[0].hits.total : 0;
  const visualizationClosedAlertsData =
    closedAlertsResponses != null ? closedAlertsResponses[0].hits.total : 0;

  const visualizationTotalAlertsData =
    visualizationOpenAlertsData +
      visualizationAcknowledgedAlertsData +
      visualizationClosedAlertsData ?? 0;

  return {
    open: visualizationOpenAlertsData,
    acknowledged: visualizationAcknowledgedAlertsData,
    closed: visualizationClosedAlertsData,
    total: visualizationTotalAlertsData,
  };
};
