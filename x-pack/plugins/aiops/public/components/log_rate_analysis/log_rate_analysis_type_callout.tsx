/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';
import { useAppSelector } from '@kbn/aiops-log-rate-analysis/state';
import { i18n } from '@kbn/i18n';

export const LogRateAnalysisTypeCallOut: FC = () => {
  const showCallout = useAppSelector((s) => s.logRateAnalysisResults.significantItems.length > 0);
  const zeroDocsFallback = useAppSelector((s) => s.logRateAnalysisResults.zeroDocsFallback);
  const analysisType = useAppSelector((s) => s.logRateAnalysisResults.currentAnalysisType);
  const fieldSelectionMessage = useAppSelector(
    (s) => s.logRateAnalysisFieldCandidates.fieldSelectionMessage
  );

  let callOutTitle: string;
  let callOutText: string;

  if (!showCallout) {
    return null;
  }

  if (!zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    callOutTitle = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeCallOutTitle', {
      defaultMessage: 'Analysis type: Log rate spike',
    });
    callOutText = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeCallOutContent', {
      defaultMessage:
        'The median log rate in the selected deviation time range is higher than the baseline. Therefore, the analysis results table shows statistically significant items within the deviation time range that are contributors to the spike. The "doc count" column refers to the amount of documents in the deviation time range.',
    });
  } else if (!zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.DIP) {
    callOutTitle = i18n.translate('xpack.aiops.analysis.analysisTypeDipCallOutTitle', {
      defaultMessage: 'Analysis type: Log rate dip',
    });
    callOutText = i18n.translate('xpack.aiops.analysis.analysisTypeDipCallOutContent', {
      defaultMessage:
        'The median log rate in the selected deviation time range is lower than the baseline. Therefore, the analysis results table shows statistically significant items within the baseline time range that are less in number or missing within the deviation time range. The "doc count" column refers to the amount of documents in the baseline time range.',
    });
  } else if (zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    callOutTitle = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeFallbackCallOutTitle', {
      defaultMessage: 'Analysis type: Top items for deviation time range',
    });
    callOutText = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeCallOutContentFallback', {
      defaultMessage:
        'The baseline time range does not contain any documents. Therefore the results show top log message categories and field values for the deviation time range.',
    });
  } else if (zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.DIP) {
    callOutTitle = i18n.translate('xpack.aiops.analysis.analysisTypeDipFallbackCallOutTitle', {
      defaultMessage: 'Analysis type: Top items for baseline time range',
    });
    callOutText = i18n.translate('xpack.aiops.analysis.analysisTypeDipCallOutContentFallback', {
      defaultMessage:
        'The deviation time range does not contain any documents. Therefore the results show top log message categories and field values for the baseline time range.',
    });
  } else {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={<span data-test-subj="aiopsAnalysisTypeCalloutTitle">{callOutTitle}</span>}
        color="primary"
        iconType="pin"
        size="s"
      >
        <EuiText size="s">
          {callOutText}
          {fieldSelectionMessage && ` ${fieldSelectionMessage}`}
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="xs" />
    </>
  );
};
