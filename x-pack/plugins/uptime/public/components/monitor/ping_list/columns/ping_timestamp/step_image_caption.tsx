/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { nextAriaLabel, prevAriaLabel } from './translations';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

export interface StepImageCaptionProps {
  captionContent: string;
  imgSrc?: string;
  maxSteps?: number;
  setStepNumber: React.Dispatch<React.SetStateAction<number>>;
  stepNumber: number;
  label?: string;
}

const ImageCaption = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  display: inline-block;
  width: 100%;
  text-decoration: none;
`;

export const StepImageCaption: React.FC<StepImageCaptionProps> = ({
  captionContent,
  imgSrc,
  maxSteps,
  setStepNumber,
  stepNumber,
  label,
}) => {
  return (
    <ImageCaption
      onClick={(evt) => {
        // we don't want this to be captured by row click which leads to step list page
        evt.stopPropagation();
      }}
    >
      <div className="stepArrowsFullScreen">
        {imgSrc && (
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={stepNumber === 1}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber - 1);
                  evt.preventDefault();
                }}
                iconType="arrowLeft"
                aria-label={prevAriaLabel}
              >
                {prevAriaLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>{captionContent}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={stepNumber === maxSteps}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber + 1);
                  evt.stopPropagation();
                }}
                iconType="arrowRight"
                iconSide="right"
                aria-label={nextAriaLabel}
              >
                {nextAriaLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <span className="eui-textNoWrap">{label}</span>
      </div>
    </ImageCaption>
  );
};
