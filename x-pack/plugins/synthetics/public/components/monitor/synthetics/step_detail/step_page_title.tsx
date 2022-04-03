/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  stepName: string;
  stepIndex: number;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
}

export const StepPageTitleContent = ({
  stepIndex,
  totalSteps,
  handleNextStep,
  handlePreviousStep,
  hasNextStep,
  hasPreviousStep,
}: Props) => {
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
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
  );
};
