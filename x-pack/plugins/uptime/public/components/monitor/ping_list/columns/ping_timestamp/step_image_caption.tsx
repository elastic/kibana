/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { nextAriaLabel, prevAriaLabel } from './translations';
import { getShortTimeStamp } from '../../../../overview/monitor_list/columns/monitor_status_column';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

export interface StepImageCaptionProps {
  captionContent: string;
  imgSrc?: string;
  maxSteps?: number;
  setStepNumber: React.Dispatch<React.SetStateAction<number>>;
  stepNumber: number;
  timestamp: string;
  isLoading: boolean;
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
  timestamp,
  isLoading,
}) => {
  return (
    <ImageCaption>
      <div className="stepArrowsFullScreen">
        {imgSrc && (
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={stepNumber === 1}
                onClick={() => {
                  setStepNumber(stepNumber - 1);
                }}
                iconType="arrowLeft"
                aria-label={prevAriaLabel}
                isLoading={isLoading}
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
                onClick={() => {
                  setStepNumber(stepNumber + 1);
                }}
                iconType="arrowRight"
                iconSide="right"
                aria-label={nextAriaLabel}
                isLoading={isLoading}
              >
                {nextAriaLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <span className="eui-textNoWrap">{getShortTimeStamp(moment(timestamp))}</span>
      </div>
    </ImageCaption>
  );
};
