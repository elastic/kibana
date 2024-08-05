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
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { BulkUpsertAssetCriticalityRecordsResponse } from '../../../../../common/entity_analytics/asset_criticality/types';
import { buildAnnotationsFromError } from '../helpers';
import { useScheduleNowRiskEngineMutation } from '../../../api/hooks/use_schedule_now_risk_engine_mutation';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';

export const AssetCriticalityResultStep: React.FC<{
  result?: BulkUpsertAssetCriticalityRecordsResponse;
  validLinesAsText: string;
  errorMessage?: string;
  onReturn: () => void;
}> = React.memo(({ result, validLinesAsText, errorMessage, onReturn }) => {
  const { euiTheme } = useEuiTheme();
  const scheduleNowMutation = useScheduleNowRiskEngineMutation();
  //   onSuccess: () => {
  //     addSuccess(i18n.RISK_SCORE_MODULE_TURNED_OFF, toastOptions);
  //   },

  const { data: riskEngineStatus, isLoading: isRiskEngineStatusLoading } = useRiskEngineStatus();

  const scheduleRiskEngine = useCallback(() => {
    scheduleNowMutation.mutate();
  }, [scheduleNowMutation]);

  // console.log('risk_engine_task_status', riskEngineStatus?.risk_engine_task_status);

  // interval: "1h"
  // runAt: "2024-07-08T12:48:37.575Z"
  // startedAt: null
  // status: "idle"

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
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successTitle',
            { defaultMessage: 'Success' }
          )}
          color="success"
          iconType="checkInCircleFilled"
        >
          <FormattedMessage
            defaultMessage="Your asset criticality levels have been assigned."
            id="xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.successMessage"
          />
        </EuiCallOut>

        <EuiSpacer size="s" />
        <EuiCallOut
          data-test-subj="???"
          title={i18n.translate('?????', { defaultMessage: 'Risk score' })}
          color="primary"
          iconType="iInCircle"
        >
          <FormattedMessage
            defaultMessage="The assigned criticalities will influence the calculated risk score on the next engine run."
            id="???"
          />
          <EuiHorizontalRule />
          <EuiFlexGroup
            direction="row"
            // justifyContent="spaceBetween"
            // alignItems="center"
            // gutterSize="s"
            // responsive={false}
          >
            <EuiFlexItem>
              <EuiText size="xs">
                {'Next engine is schedule to run in: '}
                {scheduleNowMutation.isLoading || isRiskEngineStatusLoading
                  ? 'Now running'
                  : riskEngineStatus?.risk_engine_task_status?.runAt}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="play"
                size="xs"
                onClick={scheduleRiskEngine}
                isLoading={scheduleNowMutation.isLoading || isRiskEngineStatusLoading}
              >
                {'Run engine now'}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <ResultStepFooter onReturn={onReturn} />
      </>
    );
  }

  //   /* Vector */

  // width: 16px;
  // height: 16px;

  // /* Core / $euiColorDarkestShade */
  // background: #343741;

  // /* Inside auto layout */
  // flex: none;
  // order: 0;
  // flex-grow: 0;

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
