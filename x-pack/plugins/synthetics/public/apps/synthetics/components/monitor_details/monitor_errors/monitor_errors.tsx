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
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { FailedTestsCount } from './failed_tests_count';
import { useAbsoluteDate, useGetUrlParams } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { MonitorErrorsCount } from '../monitor_summary/monitor_errors_count';
import { ErrorsList } from './errors_list';
import { MonitorFailedTests } from './failed_tests';

export const MonitorErrors = () => {
  const { euiTheme } = useEuiTheme();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const time = useAbsoluteDate({ from: dateRangeStart, to: dateRangeEnd });

  const monitorId = useMonitorQueryId();

  const panelTitleStyle = { margin: euiTheme.size.s, marginBottom: 0 };

  return (
    <>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
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
            <ErrorsList />
          </PanelWithTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3 css={panelTitleStyle}>{FAILED_TESTS_BY_STEPS_LABEL}</h3>
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
