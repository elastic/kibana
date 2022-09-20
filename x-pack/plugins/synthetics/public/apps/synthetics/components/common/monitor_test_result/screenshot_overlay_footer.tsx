/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useEffect } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ScreenshotRefImageData } from '../../../../../../common/runtime_types';

export interface ScreenshotOverlayFooterProps {
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

export const ScreenshotOverlayFooter: React.FC<ScreenshotOverlayFooterProps> = ({
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

  useEffect(() => {
    onVisible(true);
    return () => {
      onVisible(false);
    };
    // Empty deps to only trigger effect once on init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSmall = useIsWithinMaxBreakpoint('m');

  return (
    <div
      css={css`
        background-color: ${euiTheme.colors.lightShade};
        display: inline-block;
        width: 100%;
        text-decoration: none;
      `}
      onClick={(evt) => {
        // we don't want this to be captured by row click which leads to step list page
        evt.stopPropagation();
      }}
      onKeyDown={(evt) => {
        // Just to satisfy ESLint
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
              <EuiText color={euiTheme.colors.text}>{captionContent}</EuiText>
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
        <EuiText
          color={euiTheme.colors.text}
          css={{ padding: euiTheme.size.xs }}
          className="eui-textNoWrap"
          size="s"
        >
          {label}
        </EuiText>
      </div>
    </div>
  );
};

export const prevAriaLabel = i18n.translate('xpack.synthetics.monitor.step.previousStep', {
  defaultMessage: 'Previous step',
});

export const nextAriaLabel = i18n.translate('xpack.synthetics.monitor.step.nextStep', {
  defaultMessage: 'Next step',
});
