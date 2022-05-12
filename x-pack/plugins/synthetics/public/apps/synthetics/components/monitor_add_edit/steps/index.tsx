/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSteps, EuiText } from '@elastic/eui';
import { DataStream } from '../types';
import { MonitorTypeStep } from './monitor_type_step';
import { MonitorDetailsStep } from './monitor_details_step';
import { MonitorForm } from '../form';
import { AdvancedConfig } from '../advanced';

const MONITOR_TYPE_STEP = {
  title: 'Select a monitor type',
  children: <MonitorTypeStep />,
};
const MONITOR_DETAILS_STEP = {
  title: 'Monitor details',
  children: <MonitorDetailsStep />,
};

const BROWSER_STEPS = [
  MONITOR_TYPE_STEP,
  MONITOR_DETAILS_STEP,
  {
    title: 'Add a script',
    children: (
      <EuiText>
        <p>Do this 3rd</p>
      </EuiText>
    ),
  },
];

const SINGLE_PAGE_BROWSER_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const HTTP_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const ICMP_STEPS = [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP];

const TCP_STEPS = [
  MONITOR_TYPE_STEP,
  {
    title: 'Monitor details',
    children: (
      <EuiText>
        <p>Do this second</p>
      </EuiText>
    ),
  },
];

const STEPS = {
  [DataStream.BROWSER]: BROWSER_STEPS,
  [`${DataStream.BROWSER}_single`]: SINGLE_PAGE_BROWSER_STEPS,
  [DataStream.HTTP]: HTTP_STEPS,
  [DataStream.ICMP]: ICMP_STEPS,
  [DataStream.TCP]: TCP_STEPS,
};

export const MonitorSteps = () => {
  return (
    <MonitorForm>
      <EuiSteps steps={STEPS[DataStream.BROWSER]} headingElement="h3" />
      <AdvancedConfig />
    </MonitorForm>
  );
};
