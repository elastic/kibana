/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  MouseEvent,
  useContext,
  useEffect,
  useState,
  useCallback,
  KeyboardEvent,
} from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  useEuiTheme,
  EuiProgress,
  EuiOutsideClickDetector,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { SyntheticsSettingsContext } from '../../../contexts';
import { useRetrieveStepImage } from '../monitor_test_result/use_retrieve_step_image';

import { ScreenshotImage } from './screenshot_image';

export const JourneyScreenshotDialog = ({
  checkGroup,
  initialImgSrc,
  initialStepNumber,
  isOpen,
  onClose,
}: {
  checkGroup: string | undefined;
  initialImgSrc: string | undefined;
  initialStepNumber: number;
  maxSteps: number | undefined;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const isSmall = useIsWithinMaxBreakpoint('m');
  const [stepNumber, setStepNumber] = useState(initialStepNumber);

  const { basePath } = useContext(SyntheticsSettingsContext);
  const imgPath = `${basePath}/internal/uptime/journey/screenshot/${checkGroup}/${stepNumber}`;

  const imageResult = useRetrieveStepImage({
    hasIntersected: true,
    stepStatus: 'complete',
    imgPath,
    retryFetchOnRevisit: false,
    checkGroup,
  });
  const { url, loading, stepName, maxSteps } = imageResult?.[imgPath] ?? {};
  const imgSrc = stepNumber === initialStepNumber ? initialImgSrc ?? url : url;

  const stepCountLabel = formatScreenshotStepsCount(stepNumber, maxSteps ?? stepNumber);

  useEffect(() => {
    if (isOpen) {
      setStepNumber(initialStepNumber);
    }
    // do not include initialStepNumber
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, setStepNumber]);

  const onKeyDown = useCallback(
    (evt: KeyboardEvent<HTMLElement>) => {
      if (evt?.key === 'Escape') {
        onClose();
        return;
      }

      if (!maxSteps) {
        return;
      }

      const isLeft = evt?.key === 'ArrowLeft';
      const isRight = evt?.key === 'ArrowRight';
      if (isLeft && stepNumber > 1) {
        setStepNumber((s) => s - 1);
      }

      if (isRight && stepNumber < maxSteps) {
        setStepNumber((s) => s + 1);
      }
    },
    [setStepNumber, stepNumber, maxSteps, onClose]
  );

  return isOpen ? (
    <EuiOutsideClickDetector onOutsideClick={onClose}>
      <EuiModal
        onClose={(evt?: KeyboardEvent<HTMLDivElement> | MouseEvent<HTMLButtonElement>) => {
          evt?.stopPropagation?.();
          onClose();
        }}
        css={{
          outline: 0,
          maxWidth: 'calc(90vw)',
          maxHeight: 'calc(90vh)',
          borderRadius: 0,
          padding: 0,
        }}
        onKeyDown={onKeyDown}
      >
        <EuiModalBody>
          <ScreenshotImage
            label={stepCountLabel}
            imgSrc={imgSrc}
            isLoading={loading ?? false}
            animateLoading={false}
            hasBorder={false}
            size={'full'}
          />
        </EuiModalBody>

        <EuiModalFooter
          css={{
            outline: 0,
            backgroundColor: euiTheme.colors.lightShade,
            display: 'inline-block',
            width: '100%',
            textDecoration: 'none',
            padding: 0,
          }}
          onClick={(evt) => {
            // we don't want this to be captured by row click which leads to step list page
            evt.stopPropagation();
          }}
          onKeyDown={(evt) => {
            // Just to satisfy ESLint
          }}
        >
          {loading ? (
            <EuiProgress data-test-subj="screenshotImageLoadingProgress" size="xs" />
          ) : null}
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                data-test-subj="screenshotImagePreviousButton"
                css={{ marginLeft: isSmall ? 0 : 'auto' }}
                disabled={loading || !maxSteps || stepNumber === 1}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber((s) => s - 1);
                  evt.preventDefault();
                }}
                iconType="arrowLeft"
                aria-label={prevAriaLabel}
              >
                {prevAriaLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color={euiTheme.colors.text}>{stepCountLabel}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                data-test-subj="screenshotImageNextButton"
                css={{ marginRight: isSmall ? 0 : 'auto' }}
                disabled={loading || !maxSteps || stepNumber === maxSteps}
                onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                  setStepNumber((s) => s + 1);
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
          <EuiText
            color={euiTheme.colors.text}
            css={{
              outline: 0,
              padding: euiTheme.size.m,
              paddingTop: 0,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            className="eui-textNoWrap"
            size="s"
          >
            {stepName}
          </EuiText>
        </EuiModalFooter>
      </EuiModal>
    </EuiOutsideClickDetector>
  ) : null;
};

export const formatScreenshotStepsCount = (stepNumber: number, totalSteps: number) =>
  i18n.translate('xpack.synthetics.monitor.stepOfSteps', {
    defaultMessage: 'Step: {stepNumber} of {totalSteps}',
    values: {
      stepNumber,
      totalSteps,
    },
  });

const prevAriaLabel = i18n.translate('xpack.synthetics.monitor.step.previousStep', {
  defaultMessage: 'Previous step',
});

const nextAriaLabel = i18n.translate('xpack.synthetics.monitor.step.nextStep', {
  defaultMessage: 'Next step',
});
