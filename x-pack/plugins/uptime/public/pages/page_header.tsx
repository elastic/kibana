/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { UptimeDatePicker } from '../components/common/uptime_date_picker';
import { SETTINGS_ROUTE } from '../../common/constants';
import { ToggleAlertFlyoutButton } from '../components/overview/alerts/alerts_containers';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ReactRouterEuiButtonEmpty } from '../components/common/react_router_helpers';

interface PageHeaderProps {
  headingText: string | JSX.Element;
  extraLinks?: boolean;
  datePicker?: boolean;
}

export const SETTINGS_LINK_TEXT = i18n.translate('xpack.uptime.page_header.settingsLink', {
  defaultMessage: 'Settings',
});

const ADD_DATA_LABEL = i18n.translate('xpack.uptime.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

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
  ({ headingText, extraLinks = false, datePicker = true }: PageHeaderProps) => {
    const DatePickerComponent = () =>
      datePicker ? (
        <StyledPicker grow={false} style={{ flexBasis: 485 }}>
          <UptimeDatePicker />
        </StyledPicker>
      ) : null;

    const kibana = useKibana();

    const extraLinkComponents = !extraLinks ? null : (
      <EuiFlexGroup alignItems="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <ToggleAlertFlyoutButton />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ReactRouterEuiButtonEmpty
            data-test-subj="settings-page-link"
            iconType="gear"
            to={SETTINGS_ROUTE}
          >
            {SETTINGS_LINK_TEXT}
          </ReactRouterEuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={kibana.services?.application?.getUrlForApp('/home#/tutorial/uptimeMonitors')}
            color="primary"
            iconType="plusInCircle"
          >
            {ADD_DATA_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          wrap
          responsive={false}
        >
          <EuiFlexItem grow={true}>
            <EuiTitle>
              <h1 className="eui-textNoWrap">{headingText}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {extraLinks && <EuiFlexItem grow={false}>{extraLinkComponents}</EuiFlexItem>}
          <DatePickerComponent />
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    );
  }
);
