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
  const { getPath } = useWizard();
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
          onClick: () => {},
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.configureLogs',
            {
              defaultMessage: 'Configure logs',
            }
          ),
          status: getStatus('configureLogs'),
          onClick: () => {},
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.installShipper',
            {
              defaultMessage: 'Install shipper',
            }
          ),
          status: getStatus('installElasticAgent'),
          onClick: () => {},
        },
        {
          title: i18n.translate(
            'xpack.observability_onboarding.steps.collectLogs',
            {
              defaultMessage: 'Collect logs',
            }
          ),
          status: getStatus('collectLogs'),
          onClick: () => {},
        },
      ]}
    />
  );
}
