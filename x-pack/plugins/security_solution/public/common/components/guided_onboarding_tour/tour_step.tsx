/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButton, EuiImage, EuiSpacer, EuiText, EuiTourStep } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import styled from 'styled-components';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { TimelineId } from '../../../../common/types';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useTourContext } from './tour';
import { AlertsCasesTourSteps, SecurityStepId, securityTourConfig } from './tour_config';

interface SecurityTourStep {
  children?: React.ReactElement;
  onClick?: () => void;
  step: number;
  tourId: SecurityStepId;
}

const isStepExternallyMounted = (tourId: SecurityStepId, step: number) =>
  (step === AlertsCasesTourSteps.createCase || step === AlertsCasesTourSteps.submitCase) &&
  tourId === SecurityStepId.alertsCases;

const StyledTourStep = styled(EuiTourStep)<EuiTourStepProps & { tourId: SecurityStepId }>`
  &.euiPopover__panel[data-popover-open] {
    z-index: ${({ step, tourId }) =>
      isStepExternallyMounted(tourId, step) ? '9000 !important' : '1000 !important'};
  }
`;

export const SecurityTourStep = ({ children, onClick, step, tourId }: SecurityTourStep) => {
  const { activeStep, incrementStep, isTourShown } = useTourContext();
  const tourStep = useMemo(
    () => securityTourConfig[tourId].find((config) => config.step === step),
    [step, tourId]
  );

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const showTimeline = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
  );

  const onClickNext = useCallback(
    // onClick should call incrementStep itself
    () => (onClick ? onClick() : incrementStep(tourId)),
    [incrementStep, onClick, tourId]
  );

  // EUI bug, will remove once bug resolve. will link issue here as soon as i have it
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  }, []);

  // steps in Cases app are out of context.
  // If we mount this step, we know we need to render it
  // we are also managing the context on the siem end in the background
  const overrideContext = isStepExternallyMounted(tourId, step);

  if (
    tourStep == null ||
    ((step !== activeStep || !isTourShown(tourId)) && !overrideContext) ||
    showTimeline
  ) {
    return children ? children : null;
  }
  const { anchor, content, imageConfig, dataTestSubj, hideNextButton = false, ...rest } = tourStep;
  const footerAction: EuiTourStepProps['footerAction'] = !hideNextButton ? (
    <EuiButton
      size="s"
      onClick={onClickNext}
      onKeyDown={onKeyDown}
      color="success"
      data-test-subj="onboarding--securityTourNextStepButton"
      tour-step="nextButton"
    >
      <FormattedMessage
        id="xpack.securitySolution.guided_onboarding.nextStep.buttonLabel"
        defaultMessage="Next"
      />
    </EuiButton>
  ) : (
    <>
      {/* Passing empty element instead of undefined. If undefined "Skip tour" button is shown, we do not want that*/}
    </>
  );

  const commonProps = {
    ...rest,
    content: (
      <>
        <EuiText size="xs">
          <p>{content}</p>
        </EuiText>
        {imageConfig && (
          <>
            <EuiSpacer size="m" />
            <EuiImage alt={imageConfig.altText} src={imageConfig.src} size="fullWidth" />
          </>
        )}
      </>
    ),
    footerAction,
    // we would not have mounted this component if it was not open
    isStepOpen: true,
    // guided onboarding does not allow skipping tour through the steps
    onFinish: () => null,
    stepsTotal: securityTourConfig[tourId].length,
    panelProps: {
      'data-test-subj': dataTestSubj,
    },
  };

  // tour step either needs children or an anchor element
  //  see type EuiTourStepAnchorProps
  return anchor != null ? (
    <>
      <StyledTourStep tourId={tourId} {...commonProps} anchor={anchor} />
      <>{children}</>
    </>
  ) : children != null ? (
    <StyledTourStep tourId={tourId} {...commonProps}>
      {children}
    </StyledTourStep>
  ) : null;
};

interface GuidedOnboardingTourStep extends SecurityTourStep {
  // can be false if the anchor is an iterative element
  // do not use this as an "is tour active" check, the SecurityTourStep checks that anyway
  isTourAnchor?: boolean;
}

// wraps tour anchor component
// and gives the tour step itself a place to mount once it is active
// mounts the tour step with a delay to ensure the anchor will render first
export const GuidedOnboardingTourStep = ({
  children,
  // can be false if the anchor is an iterative element
  // do not use this as an "is tour active" check, the SecurityTourStep checks that anyway
  isTourAnchor = true,
  ...props
}: GuidedOnboardingTourStep) =>
  isTourAnchor ? <SecurityTourStep {...props}>{children}</SecurityTourStep> : <>{children}</>;
