/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { useRouteMatch } from 'react-router-dom';
import { UptimeDatePicker } from '../uptime_date_picker';
import { SyntheticsCallout } from '../../overview/synthetics_callout';
import { PageTabs } from './page_tabs';
import { CERTIFICATES_ROUTE, MONITOR_ROUTE } from '../../../../common/constants';
import { CertRefreshBtn } from '../../certificates/cert_refresh_btn';

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

export const PageHeader = () => {
  const isCertRoute = useRouteMatch(CERTIFICATES_ROUTE);

  const DatePickerComponent = () =>
    isCertRoute ? (
      <CertRefreshBtn />
    ) : (
      <StyledPicker grow={false} style={{ flexBasis: 485 }}>
        <UptimeDatePicker />
      </StyledPicker>
    );

  const isMonRoute = useRouteMatch(MONITOR_ROUTE);

  return (
    <>
      <SyntheticsCallout />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        wrap
        responsive={false}
      >
        <EuiFlexItem>
          <PageTabs />
        </EuiFlexItem>
        <DatePickerComponent />
      </EuiFlexGroup>
      {isMonRoute && <EuiHorizontalRule margin="m" />}
      {!isMonRoute && <EuiSpacer size="m" />}
    </>
  );
};
