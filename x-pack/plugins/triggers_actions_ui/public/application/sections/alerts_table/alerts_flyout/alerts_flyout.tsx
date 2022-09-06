/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
  EuiFlyoutFooter,
} from '@elastic/eui';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import {
  AlertsTableConfigurationRegistry,
  AlertsTableFlyoutState,
  AlertTableFlyoutComponent,
} from '../../../../types';

const AlertsFlyoutHeader = lazy(() => import('./alerts_flyout_header'));
const PAGINATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.paginationLabel',
  {
    defaultMessage: 'Alert navigation',
  }
);

interface AlertsFlyoutProps {
  alert: EcsFieldsResponse;
  alertsTableConfiguration: AlertsTableConfigurationRegistry;
  flyoutIndex: number;
  alertsCount: number;
  isLoading: boolean;
  state: AlertsTableFlyoutState;
  onClose: () => void;
  onPaginate: (pageIndex: number) => void;
}
export const AlertsFlyout: React.FunctionComponent<AlertsFlyoutProps> = ({
  alert,
  alertsTableConfiguration,
  flyoutIndex,
  alertsCount,
  isLoading,
  state,
  onClose,
  onPaginate,
}: AlertsFlyoutProps) => {
  let Header: AlertTableFlyoutComponent;
  let Body: AlertTableFlyoutComponent;
  let Footer: AlertTableFlyoutComponent;

  switch (state) {
    case AlertsTableFlyoutState.external:
      Header = alertsTableConfiguration?.externalFlyout?.header ?? AlertsFlyoutHeader;
      Body = alertsTableConfiguration?.externalFlyout?.body ?? null;
      Footer = alertsTableConfiguration?.externalFlyout?.footer ?? null;
      break;
    case AlertsTableFlyoutState.internal:
      Header = alertsTableConfiguration?.internalFlyout?.header ?? AlertsFlyoutHeader;
      Body = alertsTableConfiguration?.internalFlyout?.body ?? null;
      Footer = alertsTableConfiguration?.internalFlyout?.footer ?? null;
      break;
  }

  const passedProps = {
    alert,
    isLoading,
  };

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="alertsFlyout">
      {isLoading && <EuiProgress size="xs" color="accent" data-test-subj="alertsFlyoutLoading" />}
      <EuiFlyoutHeader hasBorder>
        <Suspense fallback={null}>
          <Header {...passedProps} />
        </Suspense>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={PAGINATION_LABEL}
              pageCount={alertsCount}
              activePage={flyoutIndex}
              onPageClick={onPaginate}
              compressed
              data-test-subj="alertsFlyoutPagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {Body && (
          <Suspense fallback={null}>
            <Body {...passedProps} />
          </Suspense>
        )}
      </EuiFlyoutBody>
      {Footer ? (
        <EuiFlyoutFooter>
          <Suspense fallback={null}>
            <Footer {...passedProps} />
          </Suspense>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};
