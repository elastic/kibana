/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy, useCallback, useMemo, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
} from '@elastic/eui';
import type { Alert, AlertsTableConfigurationRegistry } from '../../../../types';

const AlertsFlyoutHeader = lazy(() => import('./alerts_flyout_header'));
const PAGINATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.paginationLabel',
  {
    defaultMessage: 'Alert navigation',
  }
);

function usePrevious(alert: Alert) {
  const ref = useRef<Alert | null>(null);
  useEffect(() => {
    if (alert) {
      ref.current = alert;
    }
  });
  return ref.current;
}

interface AlertsFlyoutProps {
  alert: Alert;
  alertsTableConfiguration: AlertsTableConfigurationRegistry;
  flyoutIndex: number;
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
  const prevAlert = usePrevious(alert);
  const passedProps = useMemo(
    () => ({
      alert: alert === undefined && prevAlert != null ? prevAlert : alert,
      id,
      isLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <EuiFlyout onClose={onClose} size="m" data-test-subj="alertsFlyout" ownFocus={false}>
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
