/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPanel } from '@elastic/eui';

import { action } from '@storybook/addon-actions';
import {
  reduxDecorator,
  getAddonPanelParameters,
  getDisableStoryshotsParameter,
} from '../../../../storybook';
import { getSomeWorkpads } from '../../../services/stubs/workpad';

import { WorkpadTable } from './workpad_table';
import { WorkpadTable as WorkpadTableComponent } from './workpad_table.component';
import { WorkpadsContext } from './my_workpads';

export default {
  title: 'Home/Workpad Table',
  argTypes: {},
  decorators: [reduxDecorator()],
  parameters: [getAddonPanelParameters(), getDisableStoryshotsParameter()],
};

export const NoWorkpads = () => {
  const [workpads, setWorkpads] = useState(getSomeWorkpads(0));

  return (
    <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
      <EuiPanel>
        <WorkpadTable />
      </EuiPanel>
    </WorkpadsContext.Provider>
  );
};

export const HasWorkpads = () => {
  const [workpads, setWorkpads] = useState(getSomeWorkpads(5));

  return (
    <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
      <EuiPanel>
        <WorkpadTable />
      </EuiPanel>
    </WorkpadsContext.Provider>
  );
};

export const Component = ({
  workpadCount,
  canUserWrite,
  dateFormat,
}: {
  workpadCount: number;
  canUserWrite: boolean;
  dateFormat: string;
}) => {
  const [workpads, setWorkpads] = useState(getSomeWorkpads(workpadCount));

  useEffect(() => {
    setWorkpads(getSomeWorkpads(workpadCount));
  }, [workpadCount]);

  return (
    <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
      <EuiPanel>
        <WorkpadTableComponent
          {...{ workpads, canUserWrite, dateFormat }}
          onCloneWorkpad={action('onCloneWorkpad')}
          onExportWorkpad={action('onExportWorkpad')}
        />
      </EuiPanel>
    </WorkpadsContext.Provider>
  );
};

Component.args = { workpadCount: 5, canUserWrite: true, dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS' };
Component.argTypes = {};
