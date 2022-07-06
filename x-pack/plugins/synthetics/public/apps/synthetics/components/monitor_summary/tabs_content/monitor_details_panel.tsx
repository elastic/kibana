/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { MonitorTags } from './monitor_tags';
import { MonitorEnabled } from '../../monitors_page/management/monitor_list_table/monitor_enabled';
import { LocationsStatus } from './locations_status';
import {
  getSyntheticsMonitorAction,
  selectMonitorStatus,
  syntheticsMonitorSelector,
} from '../../../state/monitor_summary';
import { ConfigKey } from '../../../../../../common/runtime_types';

export const MonitorDetailsPanel = () => {
  const { data } = useSelector(selectMonitorStatus);

  const { monitorId } = useParams<{ monitorId: string }>();

  const dispatch = useDispatch();

  const { data: monitor, loading } = useSelector(syntheticsMonitorSelector);

  if (!data) {
    return <EuiLoadingSpinner />;
  }

  return (
    <Wrapper>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="responsiveColumn" compressed={true}>
        <EuiDescriptionListTitle>{ENABLED_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {monitor && (
            <MonitorEnabled
              initialLoading={loading}
              id={monitorId}
              monitor={monitor}
              reloadPage={() => {
                dispatch(getSyntheticsMonitorAction.get(monitorId));
              }}
            />
          )}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiBadge>{capitalize(data.monitor.type)}</EuiBadge>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{FREQUENCY_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>Every 10 mins</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{LOCATIONS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <LocationsStatus />
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription style={{ wordBreak: 'break-all' }}>
          <EuiLink href={data.url?.full} external>
            {data.url?.full}
            {data.url?.full}
            {data.url?.full}
            {data.url?.full}
            {data.url?.full}
          </EuiLink>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {monitor && <MonitorTags tags={monitor[ConfigKey.TAGS]} />}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </Wrapper>
  );
};

const Wrapper = euiStyled.div`
  .euiDescriptionList.euiDescriptionList--column > *,
  .euiDescriptionList.euiDescriptionList--responsiveColumn > * {
    margin-top: ${(props) => props.theme.eui.euiSizeS};
  }
`;

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
