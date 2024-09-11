/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { MachineLearningJobList } from '../../../../rule_definition_section';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';
import * as ruleDetailsI18n from '../../../../translations';

interface MachineLearningJobIdProps {
  machineLearningJobId: DiffableAllFields['machine_learning_job_id'];
}

export function MachineLearningJobIdReadOnly({ machineLearningJobId }: MachineLearningJobIdProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
          description: (
            <MachineLearningJobList jobIds={machineLearningJobId} isInteractive={false} />
          ),
        },
      ]}
    />
  );
}
