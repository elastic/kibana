/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseVisualizationData } from '../../../../common/components/visualization_actions/utils';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { VisualizationAlertsByStatusResponse } from './types';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';

export const useAlertsByStatusVisualizationData = () => {
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { inspect: inspectOpenAlerts } = useDeepEqualSelector((state) =>
    getGlobalQuery(state, `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-open`)
  );
  const { inspect: inspectAcknowledgedAlerts } = useDeepEqualSelector((state) =>
    getGlobalQuery(state, `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-acknowledged`)
  );
  const { inspect: inspectClosedAlerts } = useDeepEqualSelector((state) =>
    getGlobalQuery(state, `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-closed`)
  );
  const visualizationOpenAlertsData =
    inspectOpenAlerts != null
      ? parseVisualizationData<VisualizationAlertsByStatusResponse>(inspectOpenAlerts?.response)[0]
          .hits.total
      : 0;
  const visualizationAcknowledgedAlertsData =
    inspectAcknowledgedAlerts != null
      ? parseVisualizationData<VisualizationAlertsByStatusResponse>(
          inspectAcknowledgedAlerts?.response
        )[0].hits.total
      : 0;
  const visualizationClosedAlertsData =
    inspectClosedAlerts != null
      ? parseVisualizationData<VisualizationAlertsByStatusResponse>(
          inspectClosedAlerts?.response
        )[0].hits.total
      : 0;

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
