/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPanel } from '@elastic/eui';

import { reduxDecorator, getDisableStoryshotsParameter } from '../../../../storybook';

import { getSomeWorkpads } from '../../../services/storybook/workpad';
import { WorkpadTable as Component } from './workpad_table';
import { WorkpadsContext } from './my_workpads';

export default {
  title: 'Home/Components/Workpad Table',
  argTypes: {
    findWorkpads: {
      name: 'Number of workpads',
      type: { name: 'number' },
      defaultValue: 5,
      control: {
        type: 'range',
      },
    },
  },
  decorators: [reduxDecorator()],
  parameters: { ...getDisableStoryshotsParameter() },
};

export const WorkpadTable = (args: { findWorkpads: number }) => {
  const { findWorkpads } = args;
  const [workpads, setWorkpads] = useState(getSomeWorkpads(findWorkpads));

  useEffect(() => {
    setWorkpads(getSomeWorkpads(findWorkpads));
  }, [findWorkpads]);

  return (
    <EuiPanel>
      <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
        <Component />
      </WorkpadsContext.Provider>
    </EuiPanel>
  );
};
