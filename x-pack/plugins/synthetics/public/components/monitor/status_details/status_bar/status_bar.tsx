/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiLink,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { MonitorSSLCertificate } from './ssl_certificate';
import * as labels from '../translations';
import { StatusByLocations } from './status_by_location';
import { useStatusBar } from './use_status_bar';
import { MonitorIDLabel, OverallAvailability } from '../translations';
import { TAGS_LABEL, URL_LABEL } from '../../../common/translations';
import { MonitorLocations } from '../../../../../common/runtime_types/monitor';
import { formatAvailabilityValue } from '../availability_reporting/availability_reporting';
import { MonitorRedirects } from './monitor_redirects';
import { MonitorTags } from '../../../common/monitor_tags';

export const MonListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    width: 30%;
    max-width: 250px;
  }
`;

export const MonListDescription = styled(EuiDescriptionListDescription)`
  &&& {
    width: 70%;
    overflow-wrap: anywhere;
  }
`;

export const renderMonitorType = (type: string | undefined) => {
  switch (type) {
    case 'http':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.http', {
        defaultMessage: 'HTTP',
      });
    case 'tcp':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.tcp', {
        defaultMessage: 'TCP',
      });
    case 'icmp':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.icmp', {
        defaultMessage: 'ICMP',
      });
    case 'browser':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.browser', {
        defaultMessage: 'Browser',
      });
    default:
      return '';
  }
};

export const MonitorStatusBar: React.FC = () => {
  const { monitorId, monitorStatus, monitorLocations = {} } = useStatusBar();

  const { locations, up_history: ups, down_history: downs } = monitorLocations as MonitorLocations;

  const full = monitorStatus?.url?.full ?? '';

  const availability = (ups === 0 && downs === 0) || !ups ? 0 : (ups / (ups + downs)) * 100;

  return (
    <>
      <div>
        <StatusByLocations locations={locations ?? []} />
      </div>
      <EuiSpacer />
      <EuiDescriptionList type="column" compressed={true} textStyle="reverse">
        <MonListTitle>{OverallAvailability}</MonListTitle>
        <MonListDescription data-test-subj="uptimeOverallAvailability">
          <FormattedMessage
            id="xpack.uptime.availabilityLabelText"
            defaultMessage="{value} %"
            values={{ value: formatAvailabilityValue(availability) }}
            description="A percentage value, like 23.5 %"
          />
        </MonListDescription>
        <MonListTitle>{URL_LABEL}</MonListTitle>
        <MonListDescription data-test-subj="monitor-page-url">
          {full ? (
            <EuiLink
              aria-label={labels.monitorUrlLinkAriaLabel}
              href={full}
              target="_blank"
              external
            >
              {full}
            </EuiLink>
          ) : (
            '--'
          )}
        </MonListDescription>
        <MonListTitle>{MonitorIDLabel}</MonListTitle>
        <MonListDescription data-test-subj="monitor-page-title">{monitorId}</MonListDescription>
        {monitorStatus?.monitor?.type && (
          <>
            <MonListTitle aria-label={labels.typeAriaLabel}>{labels.typeLabel}</MonListTitle>
            <MonListDescription data-test-subj="monitor-page-type">
              {renderMonitorType(monitorStatus?.monitor?.type)}
            </MonListDescription>
          </>
        )}
        <MonListTitle>{TAGS_LABEL}</MonListTitle>
        <MonListDescription>
          <MonitorTags ping={monitorStatus} />
        </MonListDescription>
        <MonitorSSLCertificate tls={monitorStatus?.tls} />
        <MonitorRedirects monitorStatus={monitorStatus} />
      </EuiDescriptionList>
    </>
  );
};
