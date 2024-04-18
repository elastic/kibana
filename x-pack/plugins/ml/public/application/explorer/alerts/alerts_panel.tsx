/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_STATUS_ACTIVE, AlertConsumers, type AlertStatus } from '@kbn/rule-data-utils';
import React, { type FC, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ML_ALERTS_CONFIG_ID } from '../../../alerting/anomaly_detection_alerts_table/register_alerts_table_configuration';
import { CollapsiblePanel } from '../../components/collapsible_panel';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { AlertsSummary } from './alerts_summary';
import { AnomalyDetectionAlertsOverviewChart } from './chart';
import { statusNameMap } from './const';

export const AlertsPanel: FC = () => {
  const {
    services: { triggersActionsUi },
  } = useMlKibana();

  const [isOpen, setIsOpen] = useState(true);
  const [toggleSelected, setToggleSelected] = useState(`alertsSummary`);
  const {
    services: { fieldFormats },
  } = useMlKibana();
  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);
  const alertsQuery = useObservable(anomalyDetectionAlertsStateService.alertsQuery$, {});
  const isLoading = useObservable(anomalyDetectionAlertsStateService.isLoading$, true);

  const alertStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi!.alertsTableConfigurationRegistry,
    configurationId: ML_ALERTS_CONFIG_ID,
    id: `ml-details-alerts`,
    featureIds: [AlertConsumers.ML],
    query: alertsQuery,
    showExpandToDetails: true,
    showAlertStatusWithFlapping: true,
    cellContext: {
      fieldFormats,
    },
  };
  const alertsStateTable = triggersActionsUi!.getAlertsStateTable(alertStateProps);

  const toggleButtons = [
    {
      id: `alertsSummary`,
      label: i18n.translate('xpack.ml.explorer.alertsPanel.summaryLabel', {
        defaultMessage: 'Summary',
      }),
    },
    {
      id: `alertsTable`,
      label: i18n.translate('xpack.ml.explorer.alertsPanel.detailsLabel', {
        defaultMessage: 'Details',
      }),
    },
  ];

  return (
    <>
      <CollapsiblePanel
        isOpen={isOpen}
        onToggle={setIsOpen}
        header={
          <EuiFlexGroup alignItems={'center'} gutterSize={'xs'}>
            <EuiFlexItem grow={false}>
              <FormattedMessage id="xpack.ml.explorer.alertsPanel.header" defaultMessage="Alerts" />
            </EuiFlexItem>
            {isLoading ? (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size={'m'} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
        headerItems={Object.entries(countByStatus ?? {}).map(([status, count]) => {
          return (
            <>
              {statusNameMap[status as AlertStatus]}{' '}
              <EuiNotificationBadge
                size="m"
                color={status === ALERT_STATUS_ACTIVE ? 'accent' : 'subdued'}
              >
                {count}
              </EuiNotificationBadge>
            </>
          );
        })}
      >
        <AnomalyDetectionAlertsOverviewChart />

        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate('xpack.ml.explorer.alertsPanel.summaryTableToggle', {
            defaultMessage: 'Summary / Table view toggle',
          })}
          options={toggleButtons}
          idSelected={toggleSelected}
          onChange={setToggleSelected}
        />
        <EuiSpacer size="m" />

        {toggleSelected === 'alertsTable' ? alertsStateTable : <AlertsSummary />}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
