/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { nextAriaLabel, prevAriaLabel } from './translations';

export interface NavButtonsProps {
  maxSteps?: number;
  setIsImagePopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setStepNumber: React.Dispatch<React.SetStateAction<number>>;
  stepNumber: number;
}

export const NavButtons: React.FC<NavButtonsProps> = ({
  maxSteps,
  setIsImagePopoverOpen,
  setStepNumber,
  stepNumber,
}) => (
  <EuiFlexGroup
    className="stepArrows"
    gutterSize="s"
    alignItems="center"
    onMouseEnter={() => setIsImagePopoverOpen(true)}
    style={{ position: 'absolute', bottom: 0, left: 30 }}
  >
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        disabled={stepNumber === 1}
        color="subdued"
        size="s"
        onClick={() => {
          setStepNumber(stepNumber - 1);
        }}
        iconType="arrowLeft"
        aria-label={prevAriaLabel}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        disabled={stepNumber === maxSteps}
        color="subdued"
        size="s"
        onClick={() => {
          setStepNumber(stepNumber + 1);
        }}
        iconType="arrowRight"
        aria-label={nextAriaLabel}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
