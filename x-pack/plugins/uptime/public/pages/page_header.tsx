/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { UptimeDatePicker } from '../components/common/uptime_date_picker';
import { SETTINGS_ROUTE } from '../../common/constants';
import { ToggleAlertFlyoutButton } from '../components/overview/alerts/alerts_containers';

interface PageHeaderProps {
  headingText: string | JSX.Element;
  extraLinks?: boolean;
  datePicker?: boolean;
}
const SETTINGS_LINK_TEXT = i18n.translate('xpack.uptime.page_header.settingsLink', {
  defaultMessage: 'Settings',
});
export const PageHeader = React.memo(
  ({ headingText, extraLinks = false, datePicker = true }: PageHeaderProps) => {
    const datePickerComponent = datePicker ? (
      <EuiFlexItem grow={false}>
        <UptimeDatePicker />
      </EuiFlexItem>
    ) : null;

    const extraLinkComponents = !extraLinks ? null : (
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <ToggleAlertFlyoutButton />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Link to={SETTINGS_ROUTE}>
            <EuiButtonEmpty data-test-subj="settings-page-link" iconType="gear">
              {SETTINGS_LINK_TEXT}
            </EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>{headingText}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>{extraLinkComponents}</EuiFlexItem>
              <EuiFlexItem>{datePickerComponent}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    );
  }
);
