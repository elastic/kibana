/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSteps, EuiText } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ConfigKey, DataStream } from '../types';
import { StepFields } from './step_fields';
import { AdvancedConfig } from '../advanced';

const MONITOR_TYPE_STEP = {
  title: 'Select a monitor type',
  children: (
    <StepFields description="Choose a monitor that best fits your use case" stepKey="step1" />
  ),
};
const MONITOR_DETAILS_STEP = {
  title: 'Monitor details',
  children: (
    <StepFields
      description="Provide some details about how your monitor should run"
      stepKey="step2"
    />
  ),
};
const MONITOR_SCRIPT_STEP = {
  title: 'Add a script',
  children: (
    <StepFields
      description="Use Elastic Script Recorder to generate a script and then upload it. Alternatively, you can write your own Playwright script and paste it in the script editor."
      stepKey="step3"
    />
  ),
};

const BROWSER_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP, MONITOR_SCRIPT_STEP];

const SINGLE_PAGE_BROWSER_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const HTTP_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const ICMP_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const TCP_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const STEPS = {
  [DataStream.BROWSER]: BROWSER_STEPS,
  [`${DataStream.BROWSER}_single`]: SINGLE_PAGE_BROWSER_STEPS,
  [DataStream.HTTP]: HTTP_STEPS,
  [DataStream.ICMP]: ICMP_STEPS,
  [DataStream.TCP]: TCP_STEPS,
};

export const MonitorSteps = () => {
  const { watch } = useFormContext();
  const [type]: [DataStream] = watch([ConfigKey.MONITOR_TYPE]);

  return (
    <>
      <EuiSteps steps={STEPS[type]} headingElement="h3" />
      <AdvancedConfig />
    </>
  );
};
