/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSteps, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FormMonitorType } from '../types';
import { AdvancedConfig } from '../advanced';
import { StepMap } from '../form/config';
import { MonitorTypePortal } from './monitor_type_portal';

export const MonitorSteps = ({
  stepMap,
  isEditFlow = false,
}: {
  stepMap: StepMap;
  isEditFlow?: boolean;
}) => {
  const { watch } = useFormContext();
  const [type]: [FormMonitorType] = watch(['formMonitorType']);
  const steps = stepMap[type];

  return (
    <>
      {isEditFlow ? (
        steps.map((step) => (
          <>
            <EuiPanel hasBorder>
              <EuiText size="s">
                <h2>{step.title}</h2>
              </EuiText>
              <EuiSpacer size="xs" />
              {step.children}
            </EuiPanel>
            <EuiSpacer size="m" />
            <MonitorTypePortal monitorType={type} />
          </>
        ))
      ) : (
        <EuiSteps steps={steps} headingElement="h2" />
      )}
      <AdvancedConfig />
    </>
  );
};
