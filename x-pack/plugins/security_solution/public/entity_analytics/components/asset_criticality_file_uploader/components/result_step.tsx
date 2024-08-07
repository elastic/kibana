/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
  EuiText,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import type { BulkUpsertAssetCriticalityRecordsResponse } from '../../../../../common/entity_analytics/asset_criticality/types';
import { buildAnnotationsFromError, formatScheduledRunTime } from '../helpers';
import { useScheduleNowRiskEngineMutation } from '../../../api/hooks/use_schedule_now_risk_engine_mutation';
import {
  useInvalidateRiskEngineStatusQuery,
  useRiskEngineStatus,
} from '../../../api/hooks/use_risk_engine_status';

const TEN_SECONDS = 10000;

export const AssetCriticalityResultStep: React.FC<{
  result?: BulkUpsertAssetCriticalityRecordsResponse;
  validLinesAsText: string;
  errorMessage?: string;
  onReturn: () => void;
}> = React.memo(({ result, validLinesAsText, errorMessage, onReturn }) => {
  const { euiTheme } = useEuiTheme();

  //   onSuccess: () => {
  //     addSuccess(i18n.RISK_SCORE_MODULE_TURNED_OFF, toastOptions);
  //   },

  if (errorMessage !== undefined) {
    return (
      <>
        <EuiCallOut
          data-test-subj="asset-criticality-result-step-error"
          title={
            <FormattedMessage
              defaultMessage="Asset criticality assignment failed."
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.errorMessage"
            />
          }
          color="danger"
          iconType="error"
        >
          {errorMessage}
        </EuiCallOut>
        <ResultStepFooter onReturn={onReturn} />
      </>
    );
  }

  if (result === undefined) {
    return null;
  }

  if (result.stats.failed === 0) {
    return (
      <>
        <EuiCallOut
          data-test-subj="asset-criticality-result-step-success"
          title={
            <FormattedMessage
              defaultMessage="success"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successTitle"
            />
          }
          color="success"
          iconType="checkInCircleFilled"
        >
          <FormattedMessage
            defaultMessage="Your asset criticality levels have been assigned."
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successMessage"
          />
        </EuiCallOut>
        <EuiSpacer size="s" />
        <RiskEngineCallout />
        <ResultStepFooter onReturn={onReturn} />
      </>
    );
  }

  const annotations = buildAnnotationsFromError(result.errors);

  return (
    <>
      <EuiCallOut
        data-test-subj="asset-criticality-result-step-warning"
        title={
          <FormattedMessage
            defaultMessage="Some asset criticality assignments were unsuccessful due to errors."
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.title"
          />
        }
        color="warning"
        iconType="warning"
      >
        <EuiSpacer size="s" />
        <p>
          <FormattedMessage
            defaultMessage="{assignedCount, plural, one {# asset criticality assignment succeeded.} other {# asset criticality assignments succeeded.}}"
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.assignedEntities"
            values={{ assignedCount: result.stats.successful }}
          />
        </p>
        <p>
          <FormattedMessage
            defaultMessage="{failedCount, plural, one {# asset criticality assignment failed.} other {# asset criticality assignments failed.}}"
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.partialError.failedEntities"
            values={{ failedCount: result.stats.failed }}
          />
        </p>

        <EuiCodeBlock
          overflowHeight={400}
          language="CSV"
          isVirtualized
          css={css`
            border: 1px solid ${euiTheme.colors.warning};
          `}
          lineNumbers={{ annotations }}
        >
          {validLinesAsText}
        </EuiCodeBlock>
      </EuiCallOut>
      <ResultStepFooter onReturn={onReturn} />
    </>
  );
});

AssetCriticalityResultStep.displayName = 'AssetCriticalityResultStep';

const ResultStepFooter = ({ onReturn }: { onReturn: () => void }) => (
  <>
    <EuiSpacer size="xl" />
    <EuiHorizontalRule />
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiButtonEmpty onClick={onReturn}>
        <FormattedMessage
          defaultMessage="Upload another file"
          id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.uploadAnotherFile"
        />
      </EuiButtonEmpty>
    </EuiFlexGroup>
  </>
);

const RiskEngineCallout = () => {
  const { data: riskEngineStatus, isLoading: isRiskEngineStatusLoading } = useRiskEngineStatus();
  const scheduleNowMutation = useScheduleNowRiskEngineMutation();
  const [nextScheduleRun, setNextScheduleRun] = useState<string | undefined>();
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};

  const isRunning = useMemo(
    () => status === 'running' || (!!runAt && new Date(runAt) < new Date()),
    [runAt, status]
  );

  const updateCountDownText = useCallback(() => {
    if (isRunning) {
      setNextScheduleRun('Now running');
    } else {
      setNextScheduleRun(formatScheduledRunTime(riskEngineStatus?.risk_engine_task_status?.runAt));
    }
  }, [isRunning, riskEngineStatus?.risk_engine_task_status?.runAt]);

  useEffect(() => {
    updateCountDownText();
    const intervalId = setInterval(() => {
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
          id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngineCalloutTitle"
        />
      }
      color="primary"
      iconType="iInCircle"
    >
      <FormattedMessage
        defaultMessage="The assigned criticalities will influence the calculated risk score on the next engine run."
        id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngineCalloutText"
      />
      <EuiHorizontalRule />
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiText size="xs">
            <FormattedMessage
              defaultMessage="Next engine is schedule to run in:"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngineScheduleText"
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
              id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngineRunNow"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
