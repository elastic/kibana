/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStepsHorizontal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useWizard } from '.';

export function HorizontalSteps() {
  const { getPath, goToStep } = useWizard();
  const [currentStep, ...previousSteps] = getPath().reverse();

  function getStatus(stepKey: ReturnType<typeof getPath>[0]) {
    if (currentStep === stepKey) {
      return 'current';
    }
    if (previousSteps.includes(stepKey)) {
      return 'complete';
    }
    return 'incomplete';
  }

  function isDisabled(stepKey: ReturnType<typeof getPath>[0]) {
    return getStatus(stepKey) === 'incomplete';
  }

  return (
    <EuiStepsHorizontal
      steps={[
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.selectLogs',
            {
              defaultMessage: 'Select logs',
            }
          ),
          status: getStatus('selectLogs'),
          onClick: () => {
            goToStep('selectLogs');
          },
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.configureLogs',
            {
              defaultMessage: 'Configure logs',
            }
          ),
          status: getStatus('configureLogs'),
          disabled: isDisabled('configureLogs'),
          onClick: () => {
            goToStep('configureLogs');
          },
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.installShipper',
            {
              defaultMessage: 'Install shipper',
            }
          ),
          status: getStatus('installElasticAgent'),
          disabled: isDisabled('installElasticAgent'),
          onClick: () => {
            goToStep('installElasticAgent');
          },
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.collectLogs',
            {
              defaultMessage: 'Collect logs',
            }
          ),
          status: getStatus('collectLogs'),
          disabled: isDisabled('collectLogs'),
          onClick: () => {
            goToStep('collectLogs');
          },
        },
      ]}
    />
  );
}
