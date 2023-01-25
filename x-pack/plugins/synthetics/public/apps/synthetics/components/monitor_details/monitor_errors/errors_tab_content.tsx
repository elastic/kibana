/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PingState } from '../../../../../../common/runtime_types';
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { MonitorErrorsCount } from '../monitor_summary/monitor_errors_count';
import { FailedTestsCount } from './failed_tests_count';
import { MonitorFailedTests } from './failed_tests';
import { ErrorsList } from './errors_list';
import { useAbsoluteDate, useGetUrlParams } from '../../../hooks';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

export const ErrorsTabContent = ({
  errorStates,
  loading,
}: {
  errorStates: PingState[];
  loading: boolean;
}) => {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const time = useAbsoluteDate({ from: dateRangeStart, to: dateRangeEnd });

  const monitorId = useMonitorQueryId();

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <PanelWithTitle title={OVERVIEW_LABEL}>
            <EuiFlexGroup>
              <EuiFlexItem>
                {monitorId && (
                  <MonitorErrorsCount from={time.from} to={time.to} monitorId={[monitorId]} />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <FailedTestsCount from={time.from} to={time.to} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </PanelWithTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <PanelWithTitle title={FAILED_TESTS_LABEL}>
            <MonitorFailedTests time={time} />
          </PanelWithTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={2}>
          <PanelWithTitle title={ERRORS_LABEL}>
            <ErrorsList errorStates={errorStates} loading={loading} />
          </PanelWithTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <PanelWithTitle title={FAILED_TESTS_BY_STEPS_LABEL} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const ERRORS_LABEL = i18n.translate('xpack.synthetics.errors.label', {
  defaultMessage: 'Errors',
});

const OVERVIEW_LABEL = i18n.translate('xpack.synthetics.errors.overview', {
  defaultMessage: 'Overview',
});

const FAILED_TESTS_LABEL = i18n.translate('xpack.synthetics.errors.failedTests', {
  defaultMessage: 'Failed tests',
});

const FAILED_TESTS_BY_STEPS_LABEL = i18n.translate('xpack.synthetics.errors.failedTests.byStep', {
  defaultMessage: 'Failed tests by step',
});
