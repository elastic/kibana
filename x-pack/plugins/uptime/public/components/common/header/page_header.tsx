/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { UptimeDatePicker } from '../uptime_date_picker';
import { SyntheticsCallout } from '../../overview/synthetics_callout';
import { PageTabs } from './page_tabs';
import { CertRefreshBtn } from '../../certificates/cert_refresh_btn';
import { ToggleAlertFlyoutButton } from '../../overview/alerts/alerts_containers';
import { MonitorPageTitle } from '../../monitor/monitor_title';

export interface Props {
  showCertificateRefreshBtn?: boolean;
  showDatePicker?: boolean;
  showMonitorTitle?: boolean;
  showTabs?: boolean;
}

const StyledPicker = styled(EuiFlexItem)`
  &&& {
    @media only screen and (max-width: 1024px) and (min-width: 868px) {
      .euiSuperDatePicker__flexWrapper {
        width: 500px;
      }
    }
    @media only screen and (max-width: 880px) {
      flex-grow: 1;
      .euiSuperDatePicker__flexWrapper {
        width: calc(100% + 8px);
      }
    }
  }
`;

export const PageHeader = ({
  showCertificateRefreshBtn = false,
  showDatePicker = false,
  showMonitorTitle = false,
  showTabs = false,
}: Props) => {
  return (
    <>
      <SyntheticsCallout />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap responsive={false}>
        <EuiFlexItem>
          {showMonitorTitle && <MonitorPageTitle />}
          {showTabs && <PageTabs />}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ToggleAlertFlyoutButton />
        </EuiFlexItem>
        {showCertificateRefreshBtn && <CertRefreshBtn />}
        {showDatePicker && (
          <StyledPicker grow={false} style={{ flexBasis: 485 }}>
            <UptimeDatePicker />
          </StyledPicker>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
