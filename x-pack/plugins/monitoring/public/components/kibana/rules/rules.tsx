/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-ignore
import { ClusterStatus } from '../cluster_status';
// @ts-ignore
import { EuiMonitoringTable } from '../../table';
// @ts-ignore
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { KIBANA_SYSTEM_ID } from '../../../../common/constants';
import { AlertsStatus } from '../../../alerts/status';
import { AlertsByName } from '../../../alerts/types';

const getColumns = (alerts: AlertsByName) => {
  const columns = [
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      render: (name: string, rule: any) => {
        return (
          <div>
            <EuiLink
              href={getSafeForExternalLink(`#/kibana/rules/${rule.id}`)}
              data-test-subj={`kibanaLink-${name}`}
            >
              {name}
            </EuiLink>
          </div>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.alertsColumnTitle', {
        defaultMessage: 'Alerts',
      }),
      field: 'isOnline',
      width: '175px',
      sortable: true,
      render: () => <AlertsStatus showBadge={true} alerts={alerts} />,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.averageDriftColumnTitle', {
        defaultMessage: 'Average drift',
      }),
      field: 'averageDrift',
      render: (value: string) => {
        return (
          <EuiToolTip content={formatMetric(value, 'ms')}>
            <span>{formatMetric(value, 'duration')}</span>
          </EuiToolTip>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.averageDurationColumnTitle', {
        defaultMessage: 'Average duration',
      }),
      field: 'averageDuration',
      render: (value: string) => {
        return (
          <EuiToolTip content={formatMetric(value, 'ms')}>
            <span>{formatMetric(value, 'duration')}</span>
          </EuiToolTip>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.totalExecutionsColumnTitle', {
        defaultMessage: 'Total executions',
      }),
      field: 'totalExecutions',
      render: (value: string) => <span>{formatNumber(value, 'int_commas')}</span>,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.rules.lastDurationColumnTitle', {
        defaultMessage: 'Last duration',
      }),
      field: 'lastExecutionDuration',
      render: (value: string) => <span>{formatNumber(value, 'duration')}</span>,
    },
  ];

  return columns;
};

interface Props {
  clusterStatus: any;
  alerts: AlertsByName;
  sorting: any;
  pagination: any;
  onTableChange: any;
  rules: any[];
}

export const KibanaRules: React.FC<Props> = (props: Props) => {
  const { rules, clusterStatus, alerts, sorting, pagination, onTableChange } = props;
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.kibana.rules.heading"
              defaultMessage="Kibana rules"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiMonitoringTable
            className="kibanaRulesTable"
            rows={rules}
            columns={getColumns(alerts)}
            sorting={sorting}
            pagination={pagination}
            productName={KIBANA_SYSTEM_ID}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate(
                  'xpack.monitoring.kibana.rules.filterInstancesPlaceholder',
                  {
                    defaultMessage: 'Filter Rules…',
                  }
                ),
              },
            }}
            onTableChange={onTableChange}
            executeQueryOptions={{
              defaultFields: ['name'],
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
