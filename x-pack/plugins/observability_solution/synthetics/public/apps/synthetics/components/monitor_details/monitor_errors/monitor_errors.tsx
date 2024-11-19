/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useMonitorDetailsPage } from '../use_monitor_details_page';
import { useMonitorErrors } from '../hooks/use_monitor_errors';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { ErrorsTabContent } from './errors_tab_content';
import { MonitorPendingWrapper } from '../monitor_pending_wrapper';

export const MonitorErrors = () => {
  const { errorStates, upStates, loading, data } = useMonitorErrors();
  const initialLoading = !data;

  const emptyState = !loading && errorStates && errorStates?.length === 0;

  const redirect = useMonitorDetailsPage();
  if (redirect) {
    return redirect;
  }

  return (
    <MonitorPendingWrapper>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      {initialLoading && <LoadingErrors />}
      {emptyState && <EmptyErrors />}
      <div style={{ visibility: initialLoading || emptyState ? 'collapse' : 'initial' }}>
        <ErrorsTabContent errorStates={errorStates} upStates={upStates} loading={loading} />
      </div>
    </MonitorPendingWrapper>
  );
};

const LoadingErrors = () => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '65vh' }}>
      <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
        <span>
          <EuiLoadingSpinner size="xxl" />
        </span>
        <EuiSpacer size="m" />
        <EuiTitle size="m">
          <h3>{CHEKCING_FOR_ERRORS}</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiText color="subdued">{LOADING_DESCRIPTION}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const EmptyErrors = () => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '65vh' }}>
      <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
        <span>
          <EuiIcon type="checkInCircleFilled" color="success" size="xl" />
        </span>
        <EuiSpacer size="m" />
        <EuiTitle size="m">
          <h3>{NO_ERRORS_FOUND}</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiText color="subdued">{KEEP_CALM}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const KEEP_CALM = i18n.translate('xpack.synthetics.errors.keepCalm', {
  defaultMessage:
    'This monitor ran successfully during the selected period. Increase the time range to check for older errors.',
});

const NO_ERRORS_FOUND = i18n.translate('xpack.synthetics.errors.noErrorsFound', {
  defaultMessage: 'No errors found',
});

const LOADING_DESCRIPTION = i18n.translate('xpack.synthetics.errors.loadingDescription', {
  defaultMessage: 'This will take just a second.',
});

const CHEKCING_FOR_ERRORS = i18n.translate('xpack.synthetics.errors.checkingForErrors', {
  defaultMessage: 'Checking for errors',
});
