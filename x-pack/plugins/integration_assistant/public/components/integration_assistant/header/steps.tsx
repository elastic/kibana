/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStepsHorizontal, type EuiStepStatus, type EuiStepsHorizontalProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

interface IntegrationsAssistantStepsProps {
  currentStep: number;
  setStep: (step: number) => void;
}

const SETUP_CONNECTOR = i18n.translate('xpack.integrationAssistant.step.install', {
  defaultMessage: 'Setup connector',
});

const CONFIGURE_INTEGRATION = i18n.translate(
  'xpack.integrationAssistant.step.configureIntegration',
  { defaultMessage: 'Configure integration' }
);

const LOGS_ANALYSIS = i18n.translate('xpack.integrationAssistant.step.logsAnalysis', {
  defaultMessage: 'Logs analysis',
});

const GENERATION = i18n.translate('xpack.integrationAssistant.step.generation', {
  defaultMessage: 'Generation',
});

const INSTALL = i18n.translate('xpack.integrationAssistant.step.install', {
  defaultMessage: 'Install',
});

const getStepStatus = (step: number, currentStep: number): EuiStepStatus => {
  if (step === currentStep) {
    return 'current';
  } else if (step < currentStep) {
    return 'complete';
  } else {
    return 'disabled';
  }
};

const getStepOnClick = (step: number, currentStep: number, setStep: (step: number) => void) => {
  if (step < currentStep) {
    return () => setStep(step);
  }
  return () => {};
};

export const IntegrationsAssistantSteps = React.memo<IntegrationsAssistantStepsProps>(
  ({ currentStep, setStep }) => {
    const steps = useMemo<EuiStepsHorizontalProps['steps']>(() => {
      return [
        {
          title: SETUP_CONNECTOR,
          status: getStepStatus(1, currentStep),
          onClick: getStepOnClick(1, currentStep, setStep),
        },
        {
          title: CONFIGURE_INTEGRATION,
          status: getStepStatus(2, currentStep),
          onClick: getStepOnClick(2, currentStep, setStep),
        },
        {
          title: LOGS_ANALYSIS,
          status: getStepStatus(3, currentStep),
          onClick: getStepOnClick(3, currentStep, setStep),
        },
        {
          title: GENERATION,
          status: getStepStatus(4, currentStep),
          onClick: getStepOnClick(4, currentStep, setStep),
        },
        {
          title: INSTALL,
          status: getStepStatus(5, currentStep),
          onClick: getStepOnClick(5, currentStep, setStep),
        },
      ];
    }, [currentStep, setStep]);

    return <EuiStepsHorizontal steps={steps} size="s" />;
  }
);
IntegrationsAssistantSteps.displayName = 'IntegrationsAssistantSteps';
