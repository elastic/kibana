/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_DURATION, ALERT_END, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { groupBy } from 'lodash';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { getAlertFormatters } from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';

export const AlertsSummary: React.FC = () => {
  const {
    services: { fieldFormats },
  } = useMlKibana();
  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$, []);
  const formatter = getAlertFormatters(fieldFormats);

  const alertsByRule = useMemo(() => {
    return groupBy(alertsData, ALERT_RULE_NAME);
  }, [alertsData]);

  return (
    <EuiFlexGroup>
      {Object.entries(alertsByRule ?? []).map(([ruleName, alerts]) => {
        return (
          <EuiFlexItem key={ruleName} grow={false}>
            <EuiTitle size={'xs'}>
              <h5>{ruleName}</h5>
            </EuiTitle>

            <EuiDescriptionList
              compressed
              type="column"
              listItems={[
                {
                  title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.totalAlerts', {
                    defaultMessage: 'Total alerts',
                  }),
                  description: alerts.length,
                },
                {
                  title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.recoveredAt', {
                    defaultMessage: 'Recovered at',
                  }),
                  description: formatter(ALERT_END, alerts[alerts.length - 1][ALERT_END]),
                },
                {
                  title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.lastDuration', {
                    defaultMessage: 'Last duration',
                  }),
                  description: formatter(ALERT_DURATION, alerts[alerts.length - 1][ALERT_DURATION]),
                },
              ]}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
