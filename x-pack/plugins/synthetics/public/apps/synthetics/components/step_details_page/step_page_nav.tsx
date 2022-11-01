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

interface Props {
  previousCheckGroup?: string;
  dateFormat: string;
  checkTimestamp?: string;
  nextCheckGroup?: string;
  handlePreviousRunHref: string;
  handleNextRunHref: string;
}
export const StepPageNavigation = ({
  previousCheckGroup,
  dateFormat,
  handleNextRunHref,
  handlePreviousRunHref,
  checkTimestamp,
  nextCheckGroup,
}: Props) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          href={handlePreviousRunHref}
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
          href={handleNextRunHref}
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

export const PREVIOUS_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.previousCheckButtonText',
  {
    defaultMessage: 'Previous check',
  }
);

export const NEXT_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.nextCheckButtonText',
  {
    defaultMessage: 'Next check',
  }
);
