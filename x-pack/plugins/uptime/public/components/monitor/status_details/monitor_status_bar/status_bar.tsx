/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiLink,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiIcon,
} from '@elastic/eui';
import { MonitorSSLCertificate } from './ssl_certificate';
import * as labels from './translations';
import { StatusByLocations } from './status_by_location';
import { Ping } from '../../../../../common/runtime_types';
import { MonitorLocations } from '../../../../../common/runtime_types';

interface MonitorStatusBarProps {
  monitorId: string;
  monitorStatus: Ping | null;
  monitorLocations: MonitorLocations;
}

export const MonListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    width: 30%;
  }
`;

export const MonListDescription = styled(EuiDescriptionListDescription)`
  &&& {
    width: 70%;
  }
`;

export const MonitorStatusBarComponent: React.FC<MonitorStatusBarProps> = ({
  monitorId,
  monitorStatus,
  monitorLocations,
}) => {
  const full = monitorStatus?.url?.full ?? '';

  return (
    <>
      <div>
        <StatusByLocations locations={monitorLocations?.locations ?? []} />
      </div>
      <EuiSpacer />
      <EuiDescriptionList
        type="responsiveColumn"
        compressed={true}
        textStyle="reverse"
        style={{ maxWidth: '450px' }}
      >
        <MonListTitle>URL</MonListTitle>
        <MonListDescription>
          <EuiLink aria-label={labels.monitorUrlLinkAriaLabel} href={full} target="_blank">
            {full}
            <EuiIcon type={'popout'} size="s" />
          </EuiLink>
        </MonListDescription>
        <MonListTitle>Monitor ID</MonListTitle>
        <MonListDescription>
          <h4 data-test-subj="monitor-page-title">{monitorId}</h4>
        </MonListDescription>
        <MonitorSSLCertificate tls={monitorStatus?.tls} />
      </EuiDescriptionList>
    </>
  );
};
