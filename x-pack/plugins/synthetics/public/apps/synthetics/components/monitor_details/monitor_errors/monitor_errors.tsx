/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FailedTestsCount } from './failed_tests_count';
import { useGetUrlParams } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { MonitorErrorsCount } from '../monitor_summary/monitor_errors_count';
import { ErrorsList } from './errors_list';

export const MonitorErrors = () => {
  const { euiTheme } = useEuiTheme();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  return (
    <>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3 css={{ margin: euiTheme.size.s, marginBottom: 0 }}>{OVERVIEW_LABEL}</h3>
            </EuiTitle>
            <EuiFlexGroup>
              <EuiFlexItem>
                <MonitorErrorsCount to={dateRangeEnd} from={dateRangeStart} />
              </EuiFlexItem>
              <EuiFlexItem>
                <FailedTestsCount to={dateRangeEnd} from={dateRangeStart} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3 css={{ margin: euiTheme.size.s, marginBottom: 0 }}>{FAILED_TESTS_LABEL}</h3>
            </EuiTitle>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3 css={{ margin: euiTheme.size.s, marginBottom: 0 }}>{ERRORS_LABEL}</h3>
            </EuiTitle>
            <ErrorsList />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3 css={{ margin: euiTheme.size.s, marginBottom: 0 }}>
                {FAILED_TESTS_BY_STEPS_LABEL}
              </h3>
            </EuiTitle>
          </EuiPanel>
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
