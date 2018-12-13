/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { formatDateTimeLocal } from '../../../common/formatting';
import { formatTimestampToDuration } from '../../../common';
import { CALCULATE_DURATION_SINCE, EUI_SORT_DESCENDING } from '../../../common/constants';
import { mapSeverity } from './map_severity';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { FormattedAlert } from 'plugins/monitoring/components/alerts/formatted_alert';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { EuiHealth, EuiIcon } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
};
const getColumns = (kbnUrl, scope) => ([
  {
    name: 'Status',
    field: 'metadata.severity',
    sortable: true,
    render: severity => {
      const severityIcon = mapSeverity(severity);

      return (
        <Tooltip text={severityIcon.title} placement="bottom" trigger="hover">
          <EuiHealth color={severityIcon.color} data-test-subj="alertIcon" aria-label={severityIcon.title}>
            { capitalize(severityIcon.value) }
          </EuiHealth>
        </Tooltip>
      );
    }
  },
  {
    name: 'Resolved',
    field: 'resolved_timestamp',
    sortable: true,
    render: (resolvedTimestamp) => {
      const resolution = {
        icon: null,
        text: 'Not Resolved'
      };

      if (resolvedTimestamp) {
        resolution.text = `${formatTimestampToDuration(resolvedTimestamp, CALCULATE_DURATION_SINCE)} ago`;
      } else {
        resolution.icon = <EuiIcon type="alert" size="m" aria-label="Not Resolved" />;
      }

      return (
        <span>
          { resolution.icon } { resolution.text }
        </span>
      );
    },
  },
  {
    name: 'Message',
    field: 'message',
    sortable: true,
    render: (message, alert) => (
      <FormattedAlert
        prefix={alert.prefix}
        suffix={alert.suffix}
        message={message}
        metadata={alert.metadata}
        changeUrl={target => {
          scope.$evalAsync(() => {
            kbnUrl.changePath(target);
          });
        }}
      />
    )
  },
  {
    name: 'Category',
    field: 'metadata.link',
    sortable: true,
    render: link => linkToCategories[link] ? linkToCategories[link] : 'General'
  },
  {
    name: 'Last Checked',
    field: 'update_timestamp',
    sortable: true,
    render: timestamp => formatDateTimeLocal(timestamp)
  },
  {
    name: 'Triggered',
    field: 'timestamp',
    sortable: true,
    render: timestamp => formatTimestampToDuration(timestamp, CALCULATE_DURATION_SINCE) + ' ago'
  },
]);

const AlertsUI = ({ alerts, angular, sorting, pagination, onTableChange, intl }) => {
  return (
    <EuiMonitoringTable
      className="alertsTable"
      rows={alerts}
      columns={getColumns(angular.kbnUrl, angular.scope)}
      sorting={{
        ...sorting,
        sort: {
          ...sorting.sort,
          field: 'metadata.severity',
          direction: EUI_SORT_DESCENDING,
        }
      }}
      pagination={pagination}
      search={{
        box: {
          incremental: true,
          placeholder: intl.formatMessage({
            id: 'xpack.monitoring.alerts.filterAlertsPlaceholder',
            defaultMessage: 'Filter Alerts…'
          })

        },
      }}
      onTableChange={onTableChange}
    />
  );
};

export const Alerts = injectI18n(AlertsUI);
