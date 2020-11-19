/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Route, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import { UptimeDatePicker } from '../uptime_date_picker';
import { ToggleAlertFlyoutButton } from '../../overview/alerts/alerts_containers';
import { SyntheticsCallout } from '../../overview/synthetics_callout';
import { PageTabs } from './page_tabs';

interface PageHeaderProps {
  extraLinks?: boolean;
  datePicker?: boolean;
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

export const PageHeader = React.memo(
  ({ extraLinks = false, datePicker = true }: PageHeaderProps) => {
    const DatePickerComponent = () =>
      datePicker ? (
        <StyledPicker grow={false} style={{ flexBasis: 485 }}>
          <UptimeDatePicker />
        </StyledPicker>
      ) : null;

    const match = useRouteMatch();

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
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <DatePickerComponent />
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <Route path={`${match.path}status-alert/create`}>
          <ToggleAlertFlyoutButton />
        </Route>
      </>
    );
  }
);
