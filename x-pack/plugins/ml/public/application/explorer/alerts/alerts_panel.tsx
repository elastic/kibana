/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useState } from 'react';
import { groupBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonGroup,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { ALERT_DURATION, ALERT_END, ALERT_RULE_NAME, AlertConsumers } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { getAlertFormatters } from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';
import { AnomalyDetectionAlertsOverviewChart } from './chart';
import { ML_ALERTS_CONFIG_ID } from '../../../alerting/anomaly_detection_alerts_table/register_alerts_table_configuration';
import { CollapsiblePanel } from '../../components/collapsible_panel';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';

const statusNameMap: Record<string, string> = {
  active: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.active', {
    defaultMessage: 'Active',
  }),
  recovered: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.recovered', {
    defaultMessage: 'Recovered',
  }),
  untracked: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.untracked', {
    defaultMessage: 'Untracked',
  }),
};

export const AlertsPanel: FC = () => {
  const {
    services: { triggersActionsUi, fieldFormats },
  } = useMlKibana();

  const [isOpen, setIsOpen] = useState(true);
  const [toggleSelected, setToggleSelected] = useState(`alertsSummary`);

  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);
  const alertsQuery = useObservable(anomalyDetectionAlertsStateService.alertsQuery$, {});
  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$, []);

  const alertsByRule = useMemo(() => {
    return groupBy(alertsData, ALERT_RULE_NAME);
  }, [alertsData]);

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

  const formatter = getAlertFormatters(fieldFormats);

  const toggleButtons = [
    {
      id: `alertsSummary`,
      label: i18n.translate('xpack.ml.explorer.alertsPanel.summaryLabel', {
        defaultMessage: 'Summary',
      }),
    },
    {
      id: `alertsTable`,
      label: 'Details',
    },
  ];

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
              {statusNameMap[status]}{' '}
              <EuiNotificationBadge size="m" color={status === 'active' ? 'accent' : 'subdued'}>
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

        {toggleSelected === 'alertsTable' ? (
          alertsStateTable
        ) : (
          <>
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
                          title: i18n.translate(
                            'xpack.ml.explorer.alertsPanel.summary.totalAlerts',
                            {
                              defaultMessage: 'Total alerts',
                            }
                          ),
                          description: alerts.length,
                        },
                        {
                          title: i18n.translate(
                            'xpack.ml.explorer.alertsPanel.summary.recoveredAt',
                            {
                              defaultMessage: 'Recovered at',
                            }
                          ),
                          description: formatter(ALERT_END, alerts[alerts.length - 1][ALERT_END]),
                        },
                        {
                          title: i18n.translate(
                            'xpack.ml.explorer.alertsPanel.summary.lastDuration',
                            {
                              defaultMessage: 'Last duration',
                            }
                          ),
                          description: formatter(
                            ALERT_DURATION,
                            alerts[alerts.length - 1][ALERT_DURATION]
                          ),
                        },
                      ]}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </>
        )}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
