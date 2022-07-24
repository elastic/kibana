/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useJourneySteps } from '../hooks/use_journey_steps';
import { BrowserStepsList } from '../../common/monitor_test_result/browser_steps_list';
import { DataStream, Ping } from '../../../../../../common/runtime_types';
import { selectLatestPing, selectPingsLoading } from '../../../state';
import { FAILED_LABEL, COMPLETE_LABEL } from '../../common/monitor_test_result/status_badge';
import { SinglePingResult } from '../../common/monitor_test_result/single_ping_result';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';

export const LastTestRun = () => {
  const { euiTheme } = useEuiTheme();
  const latestPing = useSelector(selectLatestPing);
  const pingsLoading = useSelector(selectPingsLoading);
  const { monitor } = useSelectedMonitor();

  const { data: stepsData, loading: stepsLoading } = useJourneySteps(
    latestPing?.monitor?.check_group
  );

  const loading =
    (monitor?.id && latestPing?.monitor?.id && monitor.id !== latestPing.monitor.id) ||
    stepsLoading ||
    pingsLoading;

  return (
    <EuiPanel css={{ minHeight: 356 }}>
      <PanelHeader latestPing={latestPing} loading={loading} />
      {!loading && latestPing?.error ? (
        <EuiCallOut
          style={{
            marginTop: euiTheme.base,
            borderRadius: euiTheme.border.radius.medium,
            fontWeight: euiTheme.font.weight.semiBold,
          }}
          title={latestPing?.error.message}
          size="s"
          color="danger"
          iconType="alert"
        >
          <EuiButton color="danger">
            {i18n.translate('xpack.synthetics.monitorDetails.summary.viewErrorDetails', {
              defaultMessage: 'View error details',
            })}
          </EuiButton>
        </EuiCallOut>
      ) : null}

      <EuiSpacer size="m" />

      {monitor?.type === DataStream.BROWSER ? (
        <BrowserStepsList
          steps={stepsData?.steps ?? []}
          loading={stepsLoading}
          showStepNumber={true}
        />
      ) : (
        <SinglePingResult ping={latestPing} loading={loading} />
      )}
    </EuiPanel>
  );
};

const PanelHeader = ({ latestPing, loading }: { latestPing: Ping; loading: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const lastRunTimestamp = useMemo(
    () => (latestPing?.timestamp ? formatLastRunAt(latestPing?.timestamp) : ''),
    [latestPing?.timestamp]
  );

  const TitleNode = (
    <EuiTitle size="xs">
      <h3>{LAST_TEST_RUN_LABEL}</h3>
    </EuiTitle>
  );

  if (loading) {
    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
          <EuiFlexItem>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  if (!latestPing) {
    return <>{TitleNode}</>;
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={latestPing?.summary?.down! > 0 ? 'danger' : 'success'}>
            {latestPing?.summary?.down! > 0 ? FAILED_LABEL : COMPLETE_LABEL}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="xs" color={euiTheme.colors.darkShade}>
            {lastRunTimestamp}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="inspect"
            iconSide="left"
            data-test-subj="monitorSummaryViewLastTestRun"
            onClick={() => {}}
          >
            {i18n.translate('xpack.synthetics.monitorDetails.summary.viewTestRun', {
              defaultMessage: 'View test run',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const LAST_TEST_RUN_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.lastTestRunTitle',
  {
    defaultMessage: 'Last test run',
  }
);

const TODAY_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.today', {
  defaultMessage: 'Today',
});

const YESTERDAY_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.yesterday', {
  defaultMessage: 'Yesterday',
});

function formatLastRunAt(timestamp: string) {
  const stampedMoment = moment(timestamp);
  const startOfToday = moment().startOf('day');
  const startOfYesterday = moment().add(-1, 'day');

  const dateStr =
    stampedMoment > startOfToday
      ? `${TODAY_LABEL}`
      : stampedMoment > startOfYesterday
      ? `${YESTERDAY_LABEL}`
      : `${stampedMoment.format('ll')} `;

  const timeStr = stampedMoment.format('HH:mm:ss');

  return `${dateStr} @ ${timeStr}`;
}
