/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const StepSelect = ({
  steps,
  selectedStep,
  setSelectedStep,
}: {
  steps: number[];
  selectedStep: number;
  setSelectedStep: (locationId: number) => void;
}) => {
  const stepOptions = steps.map((step) => ({
    text: step,
    value: step,
  }));

  return (
    <EuiSelect
      data-test-subj="syntheticsMonitorSelectorEmbeddableMonitor"
      fullWidth
      prepend={i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.stepLabel', {
        defaultMessage: 'Step',
      })}
      isLoading={false}
      options={stepOptions}
      value={selectedStep}
      onChange={(event) => {
        setSelectedStep(Number(event.target.value));
      }}
    />
  );
};
