/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSwitch,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { useStatusByLocation } from '../hooks/use_status_by_location';
import { selectMonitorStatus } from '../../../state/monitor_summary';

export const MonitorDetailsPanel = () => {
  const { data } = useSelector(selectMonitorStatus);

  useStatusByLocation();

  if (!data) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      <EuiSpacer />
      <EuiDescriptionList type="responsiveColumn" style={{ maxWidth: '400px' }}>
        <EuiDescriptionListTitle>{ENABLED_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiSwitch checked={false} label={ENABLED_LABEL} onChange={() => {}} />
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiBadge>{data.monitor.type}</EuiBadge>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{FREQUENCY_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>Every 10 mins</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{LOCATIONS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiBadge iconType={() => <EuiIcon type="dot" color="success" />} color="hollow">
            US East
          </EuiBadge>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={data.url?.full}>{data.url?.full}</EuiLink>
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiBadge color="hollow">DEV</EuiBadge>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </>
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
