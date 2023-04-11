/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStepsHorizontal } from '@elastic/eui';
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
          title: 'Name logs',
          status: getStatus('nameLogs'),
          onClick: () => {},
        },
        {
          title: 'Configure logs',
          status: getStatus('configureLogs'),
          onClick: () => {},
        },
        {
          title: 'Install shipper',
          status: getStatus('installElasticAgent'),
          onClick: () => {},
        },
        {
          title: 'Import data',
          status: getStatus('importData'),
          onClick: () => {},
        },
      ]}
    />
  );
}
