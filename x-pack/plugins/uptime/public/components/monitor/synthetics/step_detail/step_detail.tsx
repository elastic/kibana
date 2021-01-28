/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import moment from 'moment';
import { WaterfallChartContainer } from './waterfall/waterfall_chart_container';

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
  checkGroup: string;
  stepName?: string;
  stepIndex: number;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
  handleNextRun: () => void;
  handlePreviousRun: () => void;
  previousCheckGroup?: string;
  nextCheckGroup?: string;
  checkTimestamp?: string;
  dateFormat: string;
}

export const StepDetail: React.FC<Props> = ({
  dateFormat,
  stepName,
  checkGroup,
  stepIndex,
  totalSteps,
  hasPreviousStep,
  hasNextStep,
  handlePreviousStep,
  handleNextStep,
  handlePreviousRun,
  handleNextRun,
  previousCheckGroup,
  nextCheckGroup,
  checkTimestamp,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h1>{stepName}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handlePreviousStep}
                    disabled={!hasPreviousStep}
                    iconType="arrowLeft"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.uptime.synthetics.stepDetail.totalSteps"
                      defaultMessage="Step {stepIndex} of {totalSteps}"
                      values={{
                        stepIndex,
                        totalSteps,
                      }}
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleNextStep}
                    disabled={!hasNextStep}
                    iconType="arrowRight"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
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
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <WaterfallChartContainer checkGroup={checkGroup} stepIndex={stepIndex} />
    </>
  );
};
