/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiLink,
  EuiIcon,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { MonitorSSLCertificate } from './ssl_certificate';
import * as labels from '../translations';
import { StatusByLocations } from './status_by_location';
import { useStatusBar } from './use_status_bar';
import { MonitorIDLabel, OverallAvailability } from '../translations';
import { URL_LABEL } from '../../../common/translations';
import { MonitorLocations } from '../../../../../common/runtime_types/monitor';

export const MonListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    width: 35%;
  }
`;

export const MonListDescription = styled(EuiDescriptionListDescription)`
  &&& {
    width: 65%;
    white-space: nowrap;
  }
`;

export const MonitorStatusBar: React.FC = () => {
  const { monitorId, monitorStatus, monitorLocations = {} } = useStatusBar();

  const { locations, ups, downs } = monitorLocations as MonitorLocations;

  const full = monitorStatus?.url?.full ?? '';

  const availability = ups === 0 && downs === 0 ? 0 : (ups / (ups + downs)) * 100;

  return (
    <>
      <div>
        <StatusByLocations locations={locations ?? []} />
      </div>
      <EuiSpacer />
      <EuiDescriptionList
        type="column"
        compressed={true}
        textStyle="reverse"
        style={{ maxWidth: '450px' }}
      >
        <MonListTitle>{OverallAvailability}</MonListTitle>
        <MonListDescription data-test-subj="uptimeOverallAvailability">
          {availability.toFixed(2)}%
        </MonListDescription>
        <MonListTitle>{URL_LABEL}</MonListTitle>
        <MonListDescription>
          <EuiLink aria-label={labels.monitorUrlLinkAriaLabel} href={full} target="_blank">
            {full} <EuiIcon type={'popout'} size="s" />
          </EuiLink>
        </MonListDescription>
        <MonListTitle>{MonitorIDLabel}</MonListTitle>
        <MonListDescription data-test-subj="monitor-page-title">{monitorId}</MonListDescription>
        <MonitorSSLCertificate tls={monitorStatus?.tls} />
      </EuiDescriptionList>
    </>
  );
};
