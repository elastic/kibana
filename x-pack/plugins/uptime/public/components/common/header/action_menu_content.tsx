/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLinks, EuiToolTip, EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createExploratoryViewUrl } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { useGetUrlParams } from '../../../hooks';
import { ToggleAlertFlyoutButton } from '../../overview/alerts/alerts_containers';
import { SETTINGS_ROUTE } from '../../../../common/constants';
import { stringifyUrlParams } from '../../../lib/helper/stringify_url_params';
import { InspectorHeaderLink } from './inspector_header_link';
import { monitorStatusSelector } from '../../../state/selectors';

const ADD_DATA_LABEL = i18n.translate('xpack.uptime.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

const ANALYZE_DATA = i18n.translate('xpack.uptime.analyzeDataButtonLabel', {
  defaultMessage: 'Analyze data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.uptime.analyzeDataButtonLabel.message', {
  defaultMessage:
    'EXPERIMENTAL - Analyze Data allows you to select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

export function ActionMenuContent(): React.ReactElement {
  const kibana = useKibana();
  const { basePath } = useUptimeSettingsContext();
  const params = useGetUrlParams();
  const { dateRangeStart, dateRangeEnd } = params;
  const history = useHistory();

  const selectedMonitor = useSelector(monitorStatusSelector);

  const monitorId = selectedMonitor?.monitor?.id;

  const syntheticExploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          dataType: 'synthetics',
          seriesType: 'area_stacked',
          selectedMetricField: 'monitor.duration.us',
          time: { from: dateRangeStart, to: dateRangeEnd },
          breakdown: monitorId ? 'observer.geo.name' : 'monitor.type',
          reportDefinitions: {
            'monitor.name': selectedMonitor?.monitor?.name ? [selectedMonitor?.monitor?.name] : [],
            'url.full': ['ALL_VALUES'],
          },
          name: monitorId ? `${monitorId}-response-duration` : 'All monitors response duration',
        },
      ],
    },
    basePath
  );

  return (
    <EuiHeaderLinks gutterSize="xs">
      <EuiHeaderLink
        aria-label={i18n.translate('xpack.uptime.page_header.settingsLink.label', {
          defaultMessage: 'Navigate to the Uptime settings page',
        })}
        color="text"
        data-test-subj="settings-page-link"
        href={history.createHref({
          pathname: SETTINGS_ROUTE,
          search: stringifyUrlParams(params, true),
        })}
      >
        <FormattedMessage id="xpack.uptime.page_header.settingsLink" defaultMessage="Settings" />
      </EuiHeaderLink>

      <ToggleAlertFlyoutButton />

      <EuiToolTip position="top" content={<p>{ANALYZE_MESSAGE}</p>}>
        <EuiHeaderLink
          aria-label={i18n.translate('xpack.uptime.page_header.analyzeData.label', {
            defaultMessage: 'Navigate to the "Analyze Data" view to visualize Synthetics/User data',
          })}
          href={syntheticExploratoryViewLink}
          color="text"
          iconType="visBarVerticalStacked"
        >
          {ANALYZE_DATA}
        </EuiHeaderLink>
      </EuiToolTip>

      <EuiHeaderLink
        aria-label={i18n.translate('xpack.uptime.page_header.addDataLink.label', {
          defaultMessage: 'Navigate to the Elastic Synthetics integration to add Uptime data',
        })}
        href={kibana.services?.application?.getUrlForApp(
          '/integrations/detail/synthetics/overview'
        )}
        color="primary"
        iconType="indexOpen"
      >
        {ADD_DATA_LABEL}
      </EuiHeaderLink>
      <InspectorHeaderLink />
    </EuiHeaderLinks>
  );
}
