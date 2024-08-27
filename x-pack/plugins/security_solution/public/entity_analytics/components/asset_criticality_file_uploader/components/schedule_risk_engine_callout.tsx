/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiText,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { formatTimeFromNow } from '../helpers';
import { useScheduleNowRiskEngineMutation } from '../../../api/hooks/use_schedule_now_risk_engine_mutation';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';

const TEN_SECONDS = 10000;

export const ScheduleRiskEngineCallout: React.FC = () => {
  const { data: riskEngineStatus, isLoading: isRiskEngineStatusLoading } =
    useRiskEngineStatus(TEN_SECONDS);
  const { addSuccess, addError } = useAppToasts();
  const { isLoading: isLoadingRiskEngineSchedule, mutate: scheduleRiskEngineMutation } =
    useScheduleNowRiskEngineMutation({
      onSuccess: () =>
        addSuccess(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.successMessage',
            {
              defaultMessage: 'Risk engine run scheduled',
            }
          )
        ),
      onError: (error) =>
        addError(error, {
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.errorMessage',
            {
              defaultMessage: 'Risk engine schedule failed',
            }
          ),
        }),
    });
  const [nextScheduleRun, setNextScheduleRun] = useState<string | undefined>();
  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};

  const isRunning = useMemo(
    () => status === 'running' || (!!runAt && new Date(runAt) < new Date()),
    [runAt, status]
  );

  const getCountDownText = useCallback(
    () =>
      isRunning
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.nowRunningMessage',
            {
              defaultMessage: 'Now running',
            }
          )
        : formatTimeFromNow(riskEngineStatus?.risk_engine_task_status?.runAt),
    [isRunning, riskEngineStatus?.risk_engine_task_status?.runAt]
  );

  useEffect(() => {
    setNextScheduleRun(getCountDownText());

    const intervalId = setInterval(() => {
      setNextScheduleRun(getCountDownText());
    }, TEN_SECONDS);

    return () => clearInterval(intervalId);
  }, [getCountDownText]);

  const scheduleRiskEngine = useCallback(() => {
    scheduleRiskEngineMutation();
  }, [scheduleRiskEngineMutation]);

  if (!riskEngineStatus?.isNewRiskScoreModuleInstalled) {
    return null;
  }

  return (
    <EuiCallOut
      data-test-subj="risk-engine-callout"
      title={
        <FormattedMessage
          defaultMessage="Risk score"
          id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.calloutTitle"
        />
      }
      color="primary"
      iconType="iInCircle"
    >
      <FormattedMessage
        defaultMessage="The assigned criticalities will influence the calculated risk score on the next engine run."
        id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.calloutText"
      />
      <EuiHorizontalRule />
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiText size="xs">
            <FormattedMessage
              defaultMessage="The next scheduled engine run is in:"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.scheduleText"
            />
            <b>{` ${nextScheduleRun}`}</b>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="play"
            size="xs"
            onClick={scheduleRiskEngine}
            isLoading={isLoadingRiskEngineSchedule || isRiskEngineStatusLoading || isRunning}
          >
            <FormattedMessage
              defaultMessage="Run engine now"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.runNowButton"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
