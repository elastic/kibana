/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPanel } from '@elastic/eui';

import {
  reduxDecorator,
  getAddonPanelParameters,
  servicesContextDecorator,
  getDisableStoryshotsParameter,
} from '../../../../storybook';
import { getSomeWorkpads } from '../../../services/stubs/workpad';

import { MyWorkpads, WorkpadsContext } from './my_workpads';
import { MyWorkpads as MyWorkpadsComponent } from './my_workpads.component';

export default {
  title: 'Home/My Workpads',
  argTypes: {},
  decorators: [reduxDecorator()],
  parameters: [getAddonPanelParameters(), getDisableStoryshotsParameter()],
};

export const NoWorkpads = () => {
  return <MyWorkpads />;
};

export const HasWorkpads = () => {
  return (
    <EuiPanel>
      <MyWorkpads />
    </EuiPanel>
  );
};

NoWorkpads.decorators = [servicesContextDecorator()];
HasWorkpads.decorators = [servicesContextDecorator({ findWorkpads: 5 })];

export const Component = ({ workpadCount }: { workpadCount: number }) => {
  const [workpads, setWorkpads] = useState(getSomeWorkpads(workpadCount));

  return (
    <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
      <EuiPanel>
        <MyWorkpadsComponent {...{ workpads }} />
      </EuiPanel>
    </WorkpadsContext.Provider>
  );
};

Component.args = { workpadCount: 5 };
