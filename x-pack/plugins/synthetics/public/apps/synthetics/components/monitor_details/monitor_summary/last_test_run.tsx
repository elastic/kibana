/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSkeletonRectangle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useParams } from 'react-router-dom';
import { getTestRunDetailLink } from '../../common/links/test_details_link';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { getErrorDetailsUrl } from '../monitor_errors/errors_list';
import {
  ConfigKey,
  DataStream,
  EncryptedSyntheticsSavedMonitor,
  Ping,
  SyntheticsJourneyApiResponse,
} from '../../../../../../common/runtime_types';
import { useFormatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';

import { useSyntheticsRefreshContext, useSyntheticsSettingsContext } from '../../../contexts';
import { BrowserStepsList } from '../../common/monitor_test_result/browser_steps_list';
import { SinglePingResult } from '../../common/monitor_test_result/single_ping_result';
import { parseBadgeStatus, StatusBadge } from '../../common/monitor_test_result/status_badge';

import { useJourneySteps } from '../hooks/use_journey_steps';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { useMonitorLatestPing } from '../hooks/use_monitor_latest_ping';

export const LastTestRun = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { data: stepsData, loading: stepsLoading } = useJourneySteps(
    latestPing?.monitor?.check_group,
    lastRefresh
  );

  const loading = stepsLoading || pingsLoading;

  return (
    <LastTestRunComponent
      stepsData={stepsData}
      latestPing={latestPing}
      loading={loading}
      stepsLoading={stepsLoading}
      isErrorDetails={false}
    />
  );
};

export const LastTestRunComponent = ({
  latestPing,
  loading,
  stepsData,
  stepsLoading,
  isErrorDetails = false,
}: {
  stepsLoading: boolean;
  latestPing?: Ping;
  loading: boolean;
  stepsData?: SyntheticsJourneyApiResponse;
  isErrorDetails?: boolean;
}) => {
  const { monitor } = useSelectedMonitor();
  const { euiTheme } = useEuiTheme();

  const selectedLocation = useSelectedLocation();
  const { basePath } = useSyntheticsSettingsContext();

  return (
    <EuiPanel hasShadow={false} hasBorder css={{ minHeight: 356 }}>
      <PanelHeader monitor={monitor} latestPing={latestPing} loading={loading} />
      {!(loading && !latestPing) && latestPing?.error ? (
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
          iconType="warning"
        >
          {isErrorDetails ? null : (
            <EuiButton
              data-test-subj="monitorTestRunViewErrorDetails"
              color="danger"
              href={getErrorDetailsUrl({
                basePath,
                configId: monitor?.[ConfigKey.CONFIG_ID]!,
                locationId: selectedLocation!.id,
                stateId: latestPing.state?.id!,
              })}
            >
              {i18n.translate('xpack.synthetics.monitorDetails.summary.viewErrorDetails', {
                defaultMessage: 'View error details',
              })}
            </EuiButton>
          )}
        </EuiCallOut>
      ) : null}

      <EuiSpacer size="m" />

      {monitor?.type === DataStream.BROWSER ? (
        <BrowserStepsList
          steps={stepsData?.steps ?? []}
          loading={stepsLoading}
          showStepNumber={true}
          showExpand={isErrorDetails}
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
  latestPing?: Ping;
  loading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const { basePath } = useSyntheticsSettingsContext();

  const selectedLocation = useSelectedLocation();

  const { monitorId } = useParams<{ monitorId: string }>();

  const lastRunTimestamp = useFormatTestRunAt(latestPing?.timestamp);

  const isBrowserMonitor = monitor?.[ConfigKey.MONITOR_TYPE] === DataStream.BROWSER;

  const TitleNode = (
    <EuiTitle size="xs">
      <h3>{LAST_TEST_RUN_LABEL}</h3>
    </EuiTitle>
  );

  if (loading && !latestPing) {
    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
          <EuiFlexItem>
            <EuiSkeletonRectangle width="52px" height="20px" />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiSkeletonText lines={1} />
          </EuiFlexItem>
          <EuiFlexItem>{isBrowserMonitor ? <EuiSkeletonText lines={1} /> : null}</EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  if (!latestPing) {
    return <>{TitleNode}</>;
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
        <EuiFlexItem grow={false} css={{ flexBasis: 'fit-content' }}>
          <StatusBadge
            status={parseBadgeStatus(latestPing?.summary?.down! > 0 ? 'fail' : 'success')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText css={{ whiteSpace: 'nowrap' }} size="xs" color={euiTheme.colors.darkShade}>
            {lastRunTimestamp}
          </EuiText>
        </EuiFlexItem>

        {isBrowserMonitor ? (
          <EuiFlexItem css={{ marginLeft: 'auto' }} grow={false}>
            <EuiButtonEmpty
              data-test-subj="monitorSummaryViewLastTestRun"
              size="xs"
              iconType="inspect"
              iconSide="left"
              href={getTestRunDetailLink({
                basePath,
                monitorId,
                checkGroup: latestPing?.monitor.check_group,
                locationId: selectedLocation?.id,
              })}
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
