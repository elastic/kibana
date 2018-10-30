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
import { FormattedAlert } from 'plugins/monitoring/components/alerts/formatted_alert';
import { mapSeverity } from 'plugins/monitoring/components/alerts/map_severity';
import { formatTimestampToDuration } from '../../../common/format_timestamp_to_duration';
import { formatDateTimeLocal } from '../../../common/formatting';
import { i18n } from '@kbn/i18n';
import { injectI18n, I18nProvider, FormattedMessage } from '@kbn/i18n/react';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
};
const filterFields = [ 'message', 'severity_group', 'prefix', 'suffix', 'metadata.link', 'since', 'timestamp', 'update_timestamp' ];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.alerts.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    sortKey: 'metadata.severity',
    sortOrder: SORT_DESCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.alerts.resolvedColumnTitle', {
      defaultMessage: 'Resolved',
    }),
    sortKey: 'resolved_timestamp'
  },
  {
    title: i18n.translate('xpack.monitoring.alerts.messageColumnTitle', {
      defaultMessage: 'Message',
    }),
    sortKey: 'message'
  },
  {
    title: i18n.translate('xpack.monitoring.alerts.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    sortKey: 'metadata.link'
  },
  {
    title: i18n.translate('xpack.monitoring.alerts.lastCheckedColumnTitle', {
      defaultMessage: 'Last Checked',
    }),
    sortKey: 'update_timestamp'
  },
  {
    title: i18n.translate('xpack.monitoring.alerts.triggeredColumnTitle', {
      defaultMessage: 'Triggered',
    }),
    sortKey: 'timestamp'
  },
];
const alertRowFactory = (scope, kbnUrl) => {
  return injectI18n(props => {
    const changeUrl = target => {
      scope.$evalAsync(() => {
        kbnUrl.changePath(target);
      });
    };
    const severityIcon = mapSeverity(props.metadata.severity);
    const resolution = {
      icon: null,
      text: props.intl.formatMessage({ id: 'xpack.monitoring.alerts.notResolvedDescription',
        defaultMessage: 'Not Resolved',
      })
    };

    if (props.resolved_timestamp) {
      resolution.text = props.intl.formatMessage({ id: 'xpack.monitoring.alerts.resolvedAgoDescription',
        defaultMessage: '{duraction} ago',
      }, { duraction: formatTimestampToDuration(props.resolved_timestamp, CALCULATE_DURATION_SINCE) }
      );
    } else {
      resolution.icon = (
        <EuiIcon
          type="alert"
          size="m"
          aria-label={props.intl.formatMessage({ id: 'xpack.monitoring.alerts.notResolvedAriaLabel', defaultMessage: 'Not Resolved', })}
        />
      );
    }

    return (
      <KuiTableRow>
        <KuiTableRowCell tabIndex="0">
          <Tooltip text={severityIcon.title} placement="bottom" trigger="hover">
            <EuiHealth color={severityIcon.color} data-test-subj="alertIcon" aria-label={severityIcon.title}>
              { capitalize(severityIcon.value) }
            </EuiHealth>
          </Tooltip>
        </KuiTableRowCell>
        <KuiTableRowCell tabIndex="0">
          { resolution.icon } { resolution.text }
        </KuiTableRowCell>
        <KuiTableRowCell tabIndex="0">
          <FormattedAlert
            prefix={props.prefix}
            suffix={props.suffix}
            message={props.message}
            metadata={props.metadata}
            changeUrl={changeUrl}
          />
        </KuiTableRowCell>
        <KuiTableRowCell tabIndex="0">
          { linkToCategories[props.metadata.link] ? linkToCategories[props.metadata.link] :
            props.intl.formatMessage({ id: 'xpack.monitoring.alerts.generalCategoryDescription', defaultMessage: 'General', }) }
        </KuiTableRowCell>
        <KuiTableRowCell tabIndex="0">
          { formatDateTimeLocal(props.update_timestamp) }
        </KuiTableRowCell>
        <KuiTableRowCell tabIndex="0">
          <FormattedMessage
            id="xpack.monitoring.alerts.trigeredAgoDescription"
            defaultMessage="{duraction} ago"
            values={{ duraction: formatTimestampToDuration(props.timestamp, CALCULATE_DURATION_SINCE) }}
          />
        </KuiTableRowCell>
      </KuiTableRow>
    );
  });
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterAlertsListing', (kbnUrl, i18n) => {
  return {
    restrict: 'E',
    scope: { alerts: '=' },
    link(scope, $el) {
      const filterAlertsPlaceholder = i18n('xpack.monitoring.alerts.filterAlertsPlaceholder', { defaultMessage: 'Filter Alerts…' });

      scope.$watch('alerts', (alerts = []) => {
        const alertsTable = (
          <I18nProvider>
            <MonitoringTable
              className="alertsTable"
              rows={alerts}
              placeholder={filterAlertsPlaceholder}
              filterFields={filterFields}
              columns={columns}
              rowComponent={alertRowFactory(scope, kbnUrl)}
            />
          </I18nProvider>
        );
        render(alertsTable, $el[0]);
      });

    }
  };
});
