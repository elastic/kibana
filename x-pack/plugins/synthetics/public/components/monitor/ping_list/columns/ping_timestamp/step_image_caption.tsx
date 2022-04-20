/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useEffect } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ScreenshotRefImageData } from '../../../../../../common/runtime_types';
import { useBreakpoints } from '../../../../../hooks';

import { nextAriaLabel, prevAriaLabel } from './translations';

export interface StepImageCaptionProps {
  captionContent: string;
  imgSrc?: string;
  imgRef?: ScreenshotRefImageData;
  maxSteps?: number;
  setStepNumber: React.Dispatch<React.SetStateAction<number>>;
  stepNumber: number;
  label?: string;
  onVisible: (val: boolean) => void;
  isLoading: boolean;
}

export const StepImageCaption: React.FC<StepImageCaptionProps> = ({
  captionContent,
  imgRef,
  imgSrc,
  maxSteps,
  setStepNumber,
  stepNumber,
  isLoading,
  label,
  onVisible,
}) => {
  const { euiTheme } = useEuiTheme();
  const breakpoints = useBreakpoints();

  useEffect(() => {
    onVisible(true);
    return () => {
      onVisible(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSmall = breakpoints.down('m');

  return (
    <CaptionWrapper
      onClick={(evt) => {
        // we don't want this to be captured by row click which leads to step list page
        evt.stopPropagation();
      }}
    >
      <div className="stepArrowsFullScreen">
        {(imgSrc || imgRef) && (
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                css={{ marginLeft: isSmall ? 0 : 'auto' }}
                disabled={stepNumber === 1}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber - 1);
                  evt.preventDefault();
                }}
                iconType="arrowLeft"
                aria-label={prevAriaLabel}
                isLoading={isLoading}
              >
                {prevAriaLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SecondaryText>{captionContent}</SecondaryText>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                css={{ marginRight: isSmall ? 0 : 'auto' }}
                disabled={stepNumber === maxSteps}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber(stepNumber + 1);
                  evt.stopPropagation();
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
        <SecondaryText css={{ padding: euiTheme.size.xs }} className="eui-textNoWrap" size="s">
          {label}
        </SecondaryText>
      </div>
    </CaptionWrapper>
  );
};

const CaptionWrapper = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  display: inline-block;
  width: 100%;
  text-decoration: none;
`;

const SecondaryText = euiStyled(EuiText)((props) => ({
  color: props.theme.eui.euiTextColor,
}));
