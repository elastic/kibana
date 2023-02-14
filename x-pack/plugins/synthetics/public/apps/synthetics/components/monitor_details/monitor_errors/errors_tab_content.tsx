/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FailedTestsByStep } from './failed_tests_by_step';
import { PingState } from '../../../../../../common/runtime_types';
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { MonitorErrorsCount } from '../monitor_summary/monitor_errors_count';
import { FailedTestsCount } from './failed_tests_count';
import { MonitorFailedTests } from './failed_tests';
import { ErrorsList } from './errors_list';
import { useRefreshedRangeFromUrl } from '../../../hooks';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

export const ErrorsTabContent = ({
  errorStates,
  loading,
}: {
  errorStates: PingState[];
  loading: boolean;
}) => {
  const time = useRefreshedRangeFromUrl();

  const monitorId = useMonitorQueryId();

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <PanelWithTitle title={OVERVIEW_LABEL} titleLeftAlign>
            <EuiFlexGroup>
              <EuiFlexItem>
                {monitorId && (
                  <MonitorErrorsCount
                    from={time.from}
                    to={time.to}
                    monitorId={[monitorId]}
                    id="monitorsErrorsCountErrors"
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <FailedTestsCount from={time.from} to={time.to} id="failedTestsCountErrors" />
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
        <FailedTestsByStep time={time} />
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
