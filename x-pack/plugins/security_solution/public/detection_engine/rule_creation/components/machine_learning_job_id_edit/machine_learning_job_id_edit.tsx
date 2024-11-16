/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '../../../../shared_imports';
import { MlJobSelect } from '../ml_job_select';

const componentProps = {
  describedByIds: ['machineLearningJobId'],
};

interface MachineLearningJobIdEditProps {
  path: string;
}

export function MachineLearningJobIdEdit({ path }: MachineLearningJobIdEditProps): JSX.Element {
  return <UseField path={path} component={MlJobSelect} componentProps={componentProps} />;
}
