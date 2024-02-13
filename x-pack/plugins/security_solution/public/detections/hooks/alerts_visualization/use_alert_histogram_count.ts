/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import numeral from '@elastic/numeral';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { SHOWING_ALERTS } from '../../components/alerts_kpis/alerts_histogram_panel/translations';
import type { AlertsTotal } from '../../components/alerts_kpis/alerts_histogram_panel/types';
import { useVisualizationResponse } from '../../../common/components/visualization_actions/use_visualization_response';

export const useAlertHistogramCount = ({
  totalAlertsObj,
  visualizationId,
  isChartEmbeddablesEnabled,
}: {
  totalAlertsObj: AlertsTotal;
  visualizationId: string;
  isChartEmbeddablesEnabled: boolean;
}): string => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { responses: visualizationResponse } = useVisualizationResponse({ visualizationId });

  const totalAlerts = useMemo(
    () =>
      SHOWING_ALERTS(
        numeral(totalAlertsObj.value).format(defaultNumberFormat),
        totalAlertsObj.value,
        totalAlertsObj.relation === 'gte' ? '>' : totalAlertsObj.relation === 'lte' ? '<' : ''
      ),
    [totalAlertsObj.value, totalAlertsObj.relation, defaultNumberFormat]
  );

  const visualizationAlerts = useMemo(() => {
    const visualizationAlertsCount =
      visualizationResponse != null ? visualizationResponse[0].hits.total : 0;
    return SHOWING_ALERTS(
      numeral(visualizationAlertsCount).format(defaultNumberFormat),
      visualizationAlertsCount,
      ''
    );
  }, [defaultNumberFormat, visualizationResponse]);

  return isChartEmbeddablesEnabled ? visualizationAlerts : totalAlerts;
};
