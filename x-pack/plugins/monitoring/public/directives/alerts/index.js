/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize } from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { EuiIcon, EuiHealth } from '@elastic/eui';
import { uiModules } from 'ui/modules';
import { KuiTableRowCell, KuiTableRow } from '@kbn/ui-framework/components';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { CALCULATE_DURATION_SINCE, SORT_DESCENDING } from '../../../common/constants';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { FormattedMessage } from 'plugins/monitoring/components/alerts/formatted_message';
import { mapSeverity } from 'plugins/monitoring/components/alerts/map_severity';
import { formatTimestampToDuration } from '../../../common/format_timestamp_to_duration';
import { formatDateTimeLocal } from '../../../common/formatting';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
};
const filterFields = [ 'message', 'severity_group', 'prefix', 'suffix', 'metadata.link', 'since', 'timestamp', 'update_timestamp' ];
const columns = [
  { title: 'Status', sortKey: 'metadata.severity', sortOrder: SORT_DESCENDING },
  { title: 'Resolved', sortKey: 'resolved_timestamp' },
  { title: 'Message', sortKey: 'message' },
  { title: 'Category', sortKey: 'metadata.link' },
  { title: 'Last Checked', sortKey: 'update_timestamp' },
  { title: 'Triggered', sortKey: 'timestamp' },
];
const alertRowFactory = (scope, kbnUrl) => {
  return props => {
    const changeUrl = target => {
      scope.$evalAsync(() => {
        kbnUrl.changePath(target);
      });
    };
    const severityIcon = mapSeverity(props.metadata.severity);
    const resolution = {
      icon: null,
      text: 'Not Resolved'
    };

    if (props.resolved_timestamp) {
      resolution.text = `${formatTimestampToDuration(props.resolved_timestamp, CALCULATE_DURATION_SINCE)} ago`;
    } else {
      resolution.icon = <EuiIcon type="alert" size="m" aria-label="Not Resolved" />;
    }

    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <Tooltip text={severityIcon.title} placement="bottom" trigger="hover">
            <EuiHealth color={severityIcon.color} data-test-subj="alertIcon" aria-label={severityIcon.title}>
              { capitalize(severityIcon.value) }
            </EuiHealth>
          </Tooltip>
        </KuiTableRowCell>
        <KuiTableRowCell>
          { resolution.icon } { resolution.text }
        </KuiTableRowCell>
        <KuiTableRowCell>
          <FormattedMessage
            prefix={props.prefix}
            suffix={props.suffix}
            message={props.message}
            metadata={props.metadata}
            changeUrl={changeUrl}
          />
        </KuiTableRowCell>
        <KuiTableRowCell>
          { linkToCategories[props.metadata.link] ? linkToCategories[props.metadata.link] : 'General' }
        </KuiTableRowCell>
        <KuiTableRowCell>
          { formatDateTimeLocal(props.update_timestamp) }
        </KuiTableRowCell>
        <KuiTableRowCell>
          { formatTimestampToDuration(props.timestamp, CALCULATE_DURATION_SINCE) } ago
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterAlertsListing', kbnUrl => {
  return {
    restrict: 'E',
    scope: { alerts: '=' },
    link(scope, $el) {

      scope.$watch('alerts', (alerts = []) => {
        const alertsTable = (
          <MonitoringTable
            className="alertsTable"
            rows={alerts}
            placeholder="Filter Alerts..."
            filterFields={filterFields}
            columns={columns}
            rowComponent={alertRowFactory(scope, kbnUrl)}
          />
        );
        render(alertsTable, $el[0]);
      });

    }
  };
});
