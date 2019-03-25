/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { DataFrameNewPivotWizardCreatePivot } from './data_frame_new_pivot_wizard_create_pivot';

interface Props {
  indexPattern: StaticIndexPattern;
}

export const DataFrameNewPivotWizard: SFC<Props> = ({ indexPattern }) => {
  const steps = [
    {
      title: 'Define pivot',
      children: <DataFrameNewPivotWizardCreatePivot indexPattern={indexPattern} />,
    },
    {
      title: 'Job details',
      children: <p />,
      status: 'incomplete' as EuiStepStatus,
    },
    {
      title: 'Create',
      children: <p />,
      status: 'incomplete' as EuiStepStatus,
    },
  ];

  return <EuiSteps steps={steps} />;
};
