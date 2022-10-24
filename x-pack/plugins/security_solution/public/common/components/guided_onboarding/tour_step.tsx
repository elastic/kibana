/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButton, EuiImage, EuiSpacer, EuiText, EuiTourStep } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useTourContext } from './tour';
import { securityTourConfig, SecurityStepId } from './tour_config';
interface SecurityTourStep {
  children?: React.ReactElement;
  step: number;
  stepId: SecurityStepId;
}

export const SecurityTourStep = ({ children, step, stepId }: SecurityTourStep) => {
  const { activeStep, incrementStep, isTourShown } = useTourContext();
  const tourStep = useMemo(
    () => securityTourConfig[stepId].find((config) => config.step === step),
    [step, stepId]
  );
  // step === 5 && stepId === SecurityStepId.alertsCases is in Cases app and out of context.
  // If we mount this step, we know we need to render it
  // we are also managing the context on the siem end in the background
  const overrideContext = step === 5 && stepId === SecurityStepId.alertsCases;
  if (tourStep == null || ((step !== activeStep || !isTourShown(stepId)) && !overrideContext)) {
    return children ? children : null;
  }

  const { anchor, content, imageConfig, dataTestSubj, hideNextButton = false, ...rest } = tourStep;

  const footerAction: EuiTourStepProps['footerAction'] = !hideNextButton ? (
    <EuiButton
      size="s"
      onClick={() => incrementStep(stepId)}
      color="success"
      data-test-subj="onboarding--securityTourNextStepButton"
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
    stepsTotal: securityTourConfig[stepId].length,
    // TODO: re-add panelProps
    // EUI has a bug https://github.com/elastic/eui/issues/6297
    // where any panelProps overwrite their panelProps,
    // so we lose cool things like the EuiBeacon
    // panelProps: {
    //   'data-test-subj': dataTestSubj,
    // }
  };

  // tour step either needs children or an anchor element
  //  see type EuiTourStepAnchorProps
  return anchor != null ? (
    <>
      <EuiTourStep {...commonProps} anchor={anchor} />
      <>{children}</>
    </>
  ) : children != null ? (
    <EuiTourStep {...commonProps}>{children}</EuiTourStep>
  ) : (
    <>{/* we should never be here, see type EuiTourStepAnchorProps */ children}</>
  );
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
