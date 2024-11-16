/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MachineLearningJobSelector } from '../../../../../../../rule_creation/components/machine_learning_job_id_edit/machine_learning_job_selector';

export function MachineLearningJobIdAdapter(): JSX.Element {
  return <MachineLearningJobSelector path="machineLearningJobId" />;
}
