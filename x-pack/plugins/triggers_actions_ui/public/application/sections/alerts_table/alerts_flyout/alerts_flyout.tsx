/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
  EuiFlyoutSize,
} from '@elastic/eui';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { AlertsTableConfigurationRegistry } from '../../../../types';

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
  flyoutSize?: EuiFlyoutSize;
  alertsCount: number;
  isLoading: boolean;
  onClose: () => void;
  onPaginate: (pageIndex: number) => void;
  id?: string;
}
export const AlertsFlyout: React.FunctionComponent<AlertsFlyoutProps> = ({
  alert,
  alertsTableConfiguration,
  flyoutIndex,
  flyoutSize = 'm',
  alertsCount,
  isLoading,
  onClose,
  onPaginate,
  id,
}: AlertsFlyoutProps) => {
  const {
    header: Header,
    body: Body,
    footer: Footer,
  } = alertsTableConfiguration?.useInternalFlyout?.() ?? {
    header: AlertsFlyoutHeader,
    body: null,
    footer: null,
  };

  const passedProps = useMemo(
    () => ({
      alert,
      id,
      isLoading,
    }),
    [alert, id, isLoading]
  );

  const FlyoutBody = useCallback(
    () =>
      Body ? (
        <Suspense fallback={null}>
          <Body {...passedProps} />
        </Suspense>
      ) : null,
    [Body, passedProps]
  );

  const FlyoutFooter = useCallback(
    () =>
      Footer ? (
        <Suspense fallback={null}>
          <Footer {...passedProps} />
        </Suspense>
      ) : null,
    [Footer, passedProps]
  );

  const FlyoutHeader = useCallback(
    () =>
      Header ? (
        <Suspense fallback={null}>
          <Header {...passedProps} />
        </Suspense>
      ) : null,
    [Header, passedProps]
  );

  return (
    <EuiFlyout onClose={onClose} size={flyoutSize} data-test-subj="alertsFlyout" ownFocus={false}>
      {isLoading && <EuiProgress size="xs" color="accent" data-test-subj="alertsFlyoutLoading" />}
      <EuiFlyoutHeader hasBorder>
        <Suspense fallback={null}>
          <FlyoutHeader />
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
      <FlyoutBody />
      <FlyoutFooter />
    </EuiFlyout>
  );
};
