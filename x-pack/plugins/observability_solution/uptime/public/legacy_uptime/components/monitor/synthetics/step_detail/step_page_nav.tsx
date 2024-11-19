/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

export const PREVIOUS_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.uptime.synthetics.stepDetail.previousCheckButtonText',
  {
    defaultMessage: 'Previous check',
  }
);

export const NEXT_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.uptime.synthetics.stepDetail.nextCheckButtonText',
  {
    defaultMessage: 'Next check',
  }
);

export const CURRENT_CHECK_ARIA_LABEL = (timestamp: string) =>
  i18n.translate('xpack.uptime.synthetics.stepDetail.currentCheckAriaLabel', {
    defaultMessage: 'Current check: {timestamp}',
    values: {
      timestamp,
    },
  });

interface Props {
  previousCheckGroup?: string;
  dateFormat: string;
  checkTimestamp?: string;
  nextCheckGroup?: string;
  handlePreviousRun: () => void;
  handleNextRun: () => void;
}
export const StepPageNavigation = ({
  previousCheckGroup,
  dateFormat,
  handleNextRun,
  handlePreviousRun,
  checkTimestamp,
  nextCheckGroup,
}: Props) => {
  const formattedTimestamp = moment(checkTimestamp).format(dateFormat);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="syntheticsStepPageNavigationButton"
          onClick={handlePreviousRun}
          disabled={!previousCheckGroup}
          iconType="arrowLeft"
          aria-label={PREVIOUS_CHECK_BUTTON_TEXT}
        >
          {PREVIOUS_CHECK_BUTTON_TEXT}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" aria-label={CURRENT_CHECK_ARIA_LABEL(formattedTimestamp)}>
          {formattedTimestamp}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="syntheticsStepPageNavigationButton"
          onClick={handleNextRun}
          disabled={!nextCheckGroup}
          iconType="arrowRight"
          iconSide="right"
          aria-label={NEXT_CHECK_BUTTON_TEXT}
        >
          {NEXT_CHECK_BUTTON_TEXT}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
