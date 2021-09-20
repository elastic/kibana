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
  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={handlePreviousRun}
          disabled={!previousCheckGroup}
          iconType="arrowLeft"
          aria-label={PREVIOUS_CHECK_BUTTON_TEXT}
        >
          {PREVIOUS_CHECK_BUTTON_TEXT}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{moment(checkTimestamp).format(dateFormat)}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
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
