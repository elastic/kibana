/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { MouseEvent } from 'react';
import { nextAriaLabel, prevAriaLabel } from './translations';

export interface StepImageCaptionProps {
  captionContent: string;
  imgSrc?: string;
  maxSteps?: number;
  setStepNumber: React.Dispatch<React.SetStateAction<number>>;
  stepNumber: number;
  label?: string;
}

export const StepImageCaption: React.FC<StepImageCaptionProps> = ({
  captionContent,
  imgSrc,
  maxSteps,
  setStepNumber,
  stepNumber,
  label,
}) => {
  return (
    <>
      <div className="stepArrowsFullScreen">
        {imgSrc && (
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={stepNumber === 1}
                size="m"
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber - 1);
                  evt.preventDefault();
                }}
                iconType="arrowLeft"
                aria-label={prevAriaLabel}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>{captionContent}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={stepNumber === maxSteps}
                size="m"
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber + 1);
                  evt.stopPropagation();
                }}
                iconType="arrowRight"
                aria-label={nextAriaLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
      {label && <span className="eui-textNoWrap">{label}</span>}
      <EuiSpacer size="s" />
    </>
  );
};
