/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLink, EuiTitle } from '@elastic/eui';

import { StatusFilter } from './status_filter';
import { MONITOR_HISTORY_ROUTE } from '../../../../../../common/constants';
import { ConfigKey, Ping } from '../../../../../../common/runtime_types';
import { useGetUrlParams } from '../../../hooks';
import { stringifyUrlParams } from '../../../utils/url_params';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';

interface TestRunsTableHeaderProps {
  pings: Ping[];
  paginable?: boolean;
  showViewHistoryButton?: boolean;
}

export const TestRunsTableHeader = ({
  pings,
  paginable,
  showViewHistoryButton = true,
}: TestRunsTableHeaderProps) => {
  const history = useHistory();
  const params = useGetUrlParams();

  const { monitor } = useSelectedMonitor();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="l" wrap={true}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{paginable || pings?.length < 10 ? TEST_RUNS : LAST_10_TEST_RUNS}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={true} />
      <EuiFlexItem grow={false}>
        <StatusFilter />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {showViewHistoryButton ? (
          <EuiLink
            data-test-subj="syntheticsTestRunsTableHeaderLink"
            href={
              monitor?.[ConfigKey.CONFIG_ID]
                ? history.createHref({
                    pathname: MONITOR_HISTORY_ROUTE.replace(
                      ':monitorId',
                      monitor[ConfigKey.CONFIG_ID]
                    ),
                    search: stringifyUrlParams(
                      { ...params, dateRangeStart: 'now-24h', dateRangeEnd: 'now' },
                      true
                    ),
                  })
                : undefined
            }
          >
            <EuiButtonEmpty
              data-test-subj="monitorStatusChartViewHistoryButton"
              size="xs"
              iconType="list"
            >
              {i18n.translate('xpack.synthetics.monitorDetails.summary.viewHistory', {
                defaultMessage: 'View History',
              })}
            </EuiButtonEmpty>
          </EuiLink>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TEST_RUNS = i18n.translate('xpack.synthetics.monitorDetails.summary.testRuns', {
  defaultMessage: 'Test Runs',
});

export const LAST_10_TEST_RUNS = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.lastTenTestRuns',
  {
    defaultMessage: 'Last 10 Test Runs',
  }
);
