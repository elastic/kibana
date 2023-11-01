/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AnomalyDetectionAlertsOverviewChart } from './alerts';
import { ML_ALERTS_CONFIG_ID } from '../../alerting/anomaly_detection_alerts_table/register_alerts_table_configuration';
import { CollapsiblePanel } from '../components/collapsible_panel';
import { useMlKibana } from '../contexts/kibana';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';

export const AlertsPanel: FC = () => {
  const {
    services: { triggersActionsUi },
  } = useMlKibana();

  const [isOpen, setIsOpen] = useState(true);

  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);
  const alertsQuery = useObservable(anomalyDetectionAlertsStateService.alertsQuery$, {});

  const alertStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi!.alertsTableConfigurationRegistry,
    configurationId: ML_ALERTS_CONFIG_ID,
    id: `ml-details-alerts`,
    featureIds: [AlertConsumers.ML],
    query: alertsQuery,
    showExpandToDetails: true,
    showAlertStatusWithFlapping: true,
  };
  const alertsStateTable = triggersActionsUi!.getAlertsStateTable(alertStateProps);

  return (
    <>
      <CollapsiblePanel
        isOpen={isOpen}
        onToggle={setIsOpen}
        header={
          <FormattedMessage id="xpack.ml.explorer.alertsPanel.header" defaultMessage="Alerts" />
        }
        headerItems={Object.entries(countByStatus ?? {}).map(([status, count]) => {
          return (
            <>
              {status}{' '}
              <EuiNotificationBadge size="m" color={count > 0 ? 'accent' : 'subdued'}>
                {count}
              </EuiNotificationBadge>
            </>
          );
        })}
      >
        <AnomalyDetectionAlertsOverviewChart />

        {alertsStateTable}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
