/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Legacy } from '../../legacy_shims';
import { upperFirst, get } from 'lodash';
import { formatDateTimeLocal } from '../../../common/formatting';
import { formatTimestampToDuration } from '../../../common';
import {
  CALCULATE_DURATION_SINCE,
  EUI_SORT_DESCENDING,
  ALERT_TYPE_LICENSE_EXPIRATION,
  ALERT_TYPE_CLUSTER_STATE,
} from '../../../common/constants';
import { mapSeverity } from './map_severity';
import { FormattedAlert } from '../../components/alerts/formatted_alert';
import { EuiMonitoringTable } from '../../components/table';
import { EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
  [ALERT_TYPE_LICENSE_EXPIRATION]: 'License expiration',
  [ALERT_TYPE_CLUSTER_STATE]: 'Cluster state',
};
const getColumns = (timezone) => [
  {
    name: i18n.translate('xpack.monitoring.alerts.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    field: 'status',
    sortable: true,
    render: (severity) => {
      const severityIconDefaults = {
        title: i18n.translate('xpack.monitoring.alerts.severityTitle.unknown', {
          defaultMessage: 'Unknown',
        }),
        color: 'subdued',
        value: i18n.translate('xpack.monitoring.alerts.severityValue.unknown', {
          defaultMessage: 'N/A',
        }),
      };
      const severityIcon = { ...severityIconDefaults, ...mapSeverity(severity) };

      return (
        <EuiToolTip content={severityIcon.title} position="bottom">
          <EuiHealth
            color={severityIcon.color}
            data-test-subj="alertIcon"
            aria-label={severityIcon.title}
          >
            {upperFirst(severityIcon.value)}
          </EuiHealth>
        </EuiToolTip>
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.resolvedColumnTitle', {
      defaultMessage: 'Resolved',
    }),
    field: 'resolved_timestamp',
    sortable: true,
    render: (resolvedTimestamp) => {
      const notResolvedLabel = i18n.translate('xpack.monitoring.alerts.notResolvedDescription', {
        defaultMessage: 'Not Resolved',
      });

      const resolution = {
        icon: null,
        text: notResolvedLabel,
      };

      if (resolvedTimestamp) {
        resolution.text = i18n.translate('xpack.monitoring.alerts.resolvedAgoDescription', {
          defaultMessage: '{duration} ago',
          values: {
            duration: formatTimestampToDuration(resolvedTimestamp, CALCULATE_DURATION_SINCE),
          },
        });
      } else {
        resolution.icon = <EuiIcon type="alert" size="m" aria-label={notResolvedLabel} />;
      }

      return (
        <span>
          {resolution.icon} {resolution.text}
        </span>
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.messageColumnTitle', {
      defaultMessage: 'Message',
    }),
    field: 'message',
    sortable: true,
    render: (_message, alert) => {
      const message = get(alert, 'message.text', get(alert, 'message', ''));
      return (
        <FormattedAlert
          prefix={alert.prefix}
          suffix={alert.suffix}
          message={message}
          metadata={alert.metadata}
        />
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    field: 'category',
    sortable: true,
    render: (link) =>
      linkToCategories[link]
        ? linkToCategories[link]
        : i18n.translate('xpack.monitoring.alerts.categoryColumn.generalLabel', {
            defaultMessage: 'General',
          }),
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.lastCheckedColumnTitle', {
      defaultMessage: 'Last Checked',
    }),
    field: 'update_timestamp',
    sortable: true,
    render: (timestamp) => formatDateTimeLocal(timestamp, timezone),
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.triggeredColumnTitle', {
      defaultMessage: 'Triggered',
    }),
    field: 'timestamp',
    sortable: true,
    render: (timestamp) =>
      i18n.translate('xpack.monitoring.alerts.triggeredColumnValue', {
        defaultMessage: '{timestamp} ago',
        values: {
          timestamp: formatTimestampToDuration(timestamp, CALCULATE_DURATION_SINCE),
        },
      }),
  },
];

export const Alerts = ({ alerts, sorting, pagination, onTableChange }) => {
  const alertsFlattened = alerts.map((alert) => ({
    ...alert,
    status: get(alert, 'metadata.severity', get(alert, 'severity', 0)),
    category: get(alert, 'metadata.link', get(alert, 'type', null)),
  }));

  const injector = Legacy.shims.getAngularInjector();
  const timezone = injector.get('config').get('dateFormat:tz');

  return (
    <EuiMonitoringTable
      className="alertsTable"
      rows={alertsFlattened}
      columns={getColumns(timezone)}
      sorting={{
        ...sorting,
        sort: {
          ...sorting.sort,
          field: 'status',
          direction: EUI_SORT_DESCENDING,
        },
      }}
      pagination={pagination}
      search={{
        box: {
          incremental: true,
          placeholder: i18n.translate('xpack.monitoring.alerts.filterAlertsPlaceholder', {
            defaultMessage: 'Filter Alerts…',
          }),
        },
      }}
      onTableChange={onTableChange}
      executeQueryOptions={{
        defaultFields: ['message', 'category'],
      }}
    />
  );
};
