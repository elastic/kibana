/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';

import {
  ConfigKey,
  DataStream,
  EncryptedSyntheticsSavedMonitor,
  Ping,
} from '../../../../../../common/runtime_types';
import { formatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';

import { useSyntheticsSettingsContext } from '../../../contexts';
import { selectLatestPing, selectPingsLoading } from '../../../state';
import { BrowserStepsList } from '../../common/monitor_test_result/browser_steps_list';
import { SinglePingResult } from '../../common/monitor_test_result/single_ping_result';
import { parseBadgeStatus, StatusBadge } from '../../common/monitor_test_result/status_badge';

import { useKibanaDateFormat } from '../../../../../hooks/use_kibana_date_format';
import { useJourneySteps } from '../hooks/use_journey_steps';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';

export const LastTestRun = () => {
  const { euiTheme } = useEuiTheme();
  const latestPing = useSelector(selectLatestPing);
  const pingsLoading = useSelector(selectPingsLoading);
  const { monitor } = useSelectedMonitor();

  const { data: stepsData, loading: stepsLoading } = useJourneySteps(
    latestPing?.monitor?.check_group
  );

  const loading = stepsLoading || pingsLoading;

  return (
    <EuiPanel hasShadow={false} hasBorder css={{ minHeight: 356 }}>
      <PanelHeader monitor={monitor} latestPing={latestPing} loading={loading} />
      {!loading && latestPing?.error ? (
        <EuiCallOut
          data-test-subj="monitorTestRunErrorCallout"
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
          <EuiButton data-test-subj="monitorTestRunViewErrorDetails" color="danger">
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

const PanelHeader = ({
  monitor,
  latestPing,
  loading,
}: {
  monitor: EncryptedSyntheticsSavedMonitor | null;
  latestPing: Ping;
  loading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const { basePath } = useSyntheticsSettingsContext();

  const format = useKibanaDateFormat();

  const lastRunTimestamp = useMemo(
    () => (latestPing?.timestamp ? formatTestRunAt(latestPing?.timestamp, format) : ''),
    [latestPing?.timestamp, format]
  );

  const isBrowserMonitor = monitor?.[ConfigKey.MONITOR_TYPE] === DataStream.BROWSER;

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
            <EuiLoadingContent css={{ width: 52 }} lines={1} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiLoadingContent lines={1} />
          </EuiFlexItem>
          <EuiFlexItem>{isBrowserMonitor ? <EuiLoadingContent lines={1} /> : null}</EuiFlexItem>
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
          <StatusBadge
            status={parseBadgeStatus(latestPing?.summary?.down! > 0 ? 'fail' : 'success')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="xs" color={euiTheme.colors.darkShade}>
            {lastRunTimestamp}
          </EuiText>
        </EuiFlexItem>

        {isBrowserMonitor ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="monitorSummaryViewLastTestRun"
              size="xs"
              iconType="inspect"
              iconSide="left"
              href={`${basePath}/app/uptime/journey/${
                latestPing?.monitor?.check_group ?? ''
              }/steps`}
            >
              {i18n.translate('xpack.synthetics.monitorDetails.summary.viewTestRun', {
                defaultMessage: 'View test run',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
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
