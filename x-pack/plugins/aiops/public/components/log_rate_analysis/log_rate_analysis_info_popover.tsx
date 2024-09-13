/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type FC } from 'react';

import { EuiBadge, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';
import { useAppSelector } from '@kbn/aiops-log-rate-analysis/state';
import { i18n } from '@kbn/i18n';

import { useEuiTheme } from '../../hooks/use_eui_theme';

export const LogRateAnalysisInfoPopoverButton: FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  label: string;
}> = ({ onClick, label }) => {
  return (
    <EuiBadge
      color="success"
      onClick={onClick}
      onClickAriaLabel='Click to open "Log rate analysis info" popover'
      data-test-subj="aiopsLogRateAnalysisInfoPopoverButton"
    >
      {label}
    </EuiBadge>
  );
};

export const LogRateAnalysisInfoPopover: FC = () => {
  const euiTheme = useEuiTheme();

  const showInfoPopover = useAppSelector(
    (s) => s.logRateAnalysisResults.significantItems.length > 0
  );
  const zeroDocsFallback = useAppSelector((s) => s.logRateAnalysisResults.zeroDocsFallback);
  const analysisType = useAppSelector((s) => s.logRateAnalysisResults.currentAnalysisType);
  const fieldSelectionMessage = useAppSelector(
    (s) => s.logRateAnalysisFieldCandidates.fieldSelectionMessage
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const infoTitlePrefix = i18n.translate('xpack.aiops.analysis.analysisTypeInfoTitlePrefix', {
    defaultMessage: 'Analysis type: ',
  });
  let infoTitle: string;
  let infoContent: string;

  if (!showInfoPopover) {
    return null;
  }

  if (!zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    infoTitle = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeInfoTitle', {
      defaultMessage: 'Log rate spike',
    });
    infoContent = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeInfoContent', {
      defaultMessage:
        'The median log rate in the selected deviation time range is higher than the baseline. Therefore, the analysis results table shows statistically significant items within the deviation time range that are contributors to the spike. The "doc count" column refers to the amount of documents in the deviation time range.',
    });
  } else if (!zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.DIP) {
    infoTitle = i18n.translate('xpack.aiops.analysis.analysisTypeDipInfoTitle', {
      defaultMessage: 'Log rate dip',
    });
    infoContent = i18n.translate('xpack.aiops.analysis.analysisTypeDipInfoContent', {
      defaultMessage:
        'The median log rate in the selected deviation time range is lower than the baseline. Therefore, the analysis results table shows statistically significant items within the baseline time range that are less in number or missing within the deviation time range. The "doc count" column refers to the amount of documents in the baseline time range.',
    });
  } else if (zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    infoTitle = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeFallbackInfoTitle', {
      defaultMessage: 'Top items for deviation time range',
    });
    infoContent = i18n.translate('xpack.aiops.analysis.analysisTypeSpikeInfoContentFallback', {
      defaultMessage:
        'The baseline time range does not contain any documents. Therefore the results show top log message categories and field values for the deviation time range.',
    });
  } else if (zeroDocsFallback && analysisType === LOG_RATE_ANALYSIS_TYPE.DIP) {
    infoTitle = i18n.translate('xpack.aiops.analysis.analysisTypeDipFallbackInfoTitle', {
      defaultMessage: 'Top items for baseline time range',
    });
    infoContent = i18n.translate('xpack.aiops.analysis.analysisTypeDipInfoContentFallback', {
      defaultMessage:
        'The deviation time range does not contain any documents. Therefore the results show top log message categories and field values for the baseline time range.',
    });
  } else {
    return null;
  }

  return (
    <EuiPopover
      anchorPosition="upCenter"
      button={
        <LogRateAnalysisInfoPopoverButton
          onClick={setIsPopoverOpen.bind(null, !isPopoverOpen)}
          label={infoTitle}
        />
      }
      closePopover={setIsPopoverOpen.bind(null, false)}
      isOpen={isPopoverOpen}
      ownFocus
      panelPaddingSize="m"
    >
      {infoTitle && (
        <EuiPopoverTitle>
          {infoTitlePrefix}
          {infoTitle}
        </EuiPopoverTitle>
      )}

      <EuiText size="s" css={{ maxWidth: `calc(${euiTheme.euiSizeXL} * 15);` }}>
        <p>
          {infoContent}
          {fieldSelectionMessage && ` ${fieldSelectionMessage}`}
        </p>
      </EuiText>
    </EuiPopover>
  );
};
