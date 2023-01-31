/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSteps, EuiPanel, EuiText, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ConfigKey, FormMonitorType, StepMap } from '../types';
import { AdvancedConfig } from '../advanced';
import { MonitorTypePortal } from './monitor_type_portal';
import { ReadOnlyCallout } from './read_only_callout';

export const MonitorSteps = ({
  stepMap,
  projectId,
  isEditFlow = false,
  readOnly = false,
}: {
  stepMap: StepMap;
  readOnly?: boolean;
  isEditFlow?: boolean;
  projectId?: string;
}) => {
  const { watch } = useFormContext();
  const [type]: [FormMonitorType] = watch([ConfigKey.FORM_MONITOR_TYPE]);
  const steps = stepMap[type];

  return (
    <>
      {readOnly ? (
        <>
          <ReadOnlyCallout projectId={projectId} />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {isEditFlow ? (
        steps.map((step) => (
          <div key={step.title}>
            <EuiPanel hasBorder>
              <EuiText size="s">
                <h2>{step.title}</h2>
              </EuiText>
              <EuiSpacer size="xs" />
              {step.children}
            </EuiPanel>
            <EuiSpacer size="m" />
          </div>
        ))
      ) : (
        <EuiSteps steps={steps} headingElement="h2" />
      )}
      <AdvancedConfig readOnly={readOnly} />
      <MonitorTypePortal monitorType={type} />
    </>
  );
};
