/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
  EuiSpacer,
  EuiLink,
  EuiLoadingContent,
  useEuiTheme,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { MonitorTags } from './monitor_tags';
import { MonitorEnabled } from '../../monitors_page/management/monitor_list_table/monitor_enabled';
import { LocationsStatus } from './locations_status';
import { getMonitorAction, selectLatestPing } from '../../../state';
import { ConfigKey } from '../../../../../../common/runtime_types';

export const MonitorDetailsPanel = () => {
  const { euiTheme } = useEuiTheme();
  const latestPing = useSelector(selectLatestPing);

  const { monitorId } = useParams<{ monitorId: string }>();

  const dispatch = useDispatch();

  const { monitor, loading } = useSelectedMonitor();

  if (
    (latestPing && latestPing?.config_id !== monitorId) ||
    (monitor && monitor.id !== monitorId)
  ) {
    return <EuiLoadingContent lines={6} />;
  }

  const wrapperStyle = css`
    .euiDescriptionList.euiDescriptionList--column > *,
    .euiDescriptionList.euiDescriptionList--responsiveColumn > * {
      margin-top: ${euiTheme.size.s};
    }
  `;

  return (
    <div css={wrapperStyle}>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" compressed={true}>
        <EuiDescriptionListTitle>{ENABLED_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {monitor && (
            <MonitorEnabled
              initialLoading={loading}
              id={monitorId}
              monitor={monitor}
              reloadPage={() => {
                dispatch(getMonitorAction.get({ monitorId }));
              }}
            />
          )}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiBadge>{capitalize(monitor?.type)}</EuiBadge>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{FREQUENCY_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>Every 10 mins</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{LOCATIONS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <LocationsStatus />
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription style={{ wordBreak: 'break-all' }}>
          <EuiLink href={latestPing?.url?.full} external>
            {latestPing?.url?.full}
          </EuiLink>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {monitor && <MonitorTags tags={monitor[ConfigKey.TAGS]} />}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </div>
  );
};

const FREQUENCY_LABEL = i18n.translate('xpack.synthetics.management.monitorList.frequency', {
  defaultMessage: 'Frequency',
});
const LOCATIONS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.locations', {
  defaultMessage: 'Locations',
});

const URL_LABEL = i18n.translate('xpack.synthetics.management.monitorList.url', {
  defaultMessage: 'URL',
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.tags', {
  defaultMessage: 'Tags',
});

const ENABLED_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails.enabled', {
  defaultMessage: 'Enabled',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.detailsPanel.monitorDetails.monitorType',
  {
    defaultMessage: 'Monitor type',
  }
);
