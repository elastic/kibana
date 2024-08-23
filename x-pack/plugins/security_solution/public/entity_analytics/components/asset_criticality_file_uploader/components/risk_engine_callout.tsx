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
import { formatScheduledRunTime } from '../helpers';
import { useScheduleNowRiskEngineMutation } from '../../../api/hooks/use_schedule_now_risk_engine_mutation';
import {
  useInvalidateRiskEngineStatusQuery,
  useRiskEngineStatus,
} from '../../../api/hooks/use_risk_engine_status';

const TEN_SECONDS = 10000;

export const RiskEngineCallout: React.FC = () => {
  const { data: riskEngineStatus, isLoading: isRiskEngineStatusLoading } = useRiskEngineStatus();
  const { addSuccess, addError } = useAppToasts();
  const scheduleNowMutation = useScheduleNowRiskEngineMutation({
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
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};

  const isRunning = useMemo(
    () => status === 'running' || (!!runAt && new Date(runAt) < new Date()),
    [runAt, status]
  );

  console.log('isRunning', { isRunning, runAt, status });

  const updateCountDownText = useCallback(() => {
    if (isRunning) {
      setNextScheduleRun('Now running');
    } else {
      setNextScheduleRun(formatScheduledRunTime(riskEngineStatus?.risk_engine_task_status?.runAt));
    }
  }, [isRunning, riskEngineStatus?.risk_engine_task_status?.runAt]);

  console.log({ nextScheduleRun });

  useEffect(() => {
    console.log('useEffect');
    updateCountDownText();
    const intervalId = setInterval(() => {
      console.log('setInterval called');
      updateCountDownText();

      if (isRunning) {
        // Periodically polls the risk engine status when the engine is running
        invalidateRiskEngineStatusQuery();
      }
    }, TEN_SECONDS);

    return () => clearInterval(intervalId);
  }, [invalidateRiskEngineStatusQuery, isRunning, updateCountDownText]);

  const scheduleRiskEngine = useCallback(() => {
    scheduleNowMutation.mutate();
  }, [scheduleNowMutation]);

  if (!riskEngineStatus?.isNewRiskScoreModuleInstalled) {
    return null;
  }

  return (
    <EuiCallOut
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
              defaultMessage="Next engine is schedule to run in:"
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
            isLoading={scheduleNowMutation.isLoading || isRiskEngineStatusLoading || isRunning}
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
