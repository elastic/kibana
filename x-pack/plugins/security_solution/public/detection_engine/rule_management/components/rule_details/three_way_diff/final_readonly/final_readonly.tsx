/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';
import { KqlQueryReadOnly } from './field_components/kql_query';
import { DataSourceReadOnly } from './field_components/data_source/data_source';
import { EqlQueryReadOnly } from './field_components/eql_query/eql_query';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { EsqlQueryReadOnly } from './field_components/esql_query/esql_query';
import { MachineLearningJobIdReadOnly } from './field_components/machine_learning_job_id/machine_learning_job_id';

interface FinalReadonlyProps {
  fieldName: keyof DiffableAllFields;
  finalDiffableRule: DiffableAllFields;
}

export function FinalReadonly({ fieldName, finalDiffableRule }: FinalReadonlyProps) {
  switch (fieldName) {
    case 'data_source':
      return <DataSourceReadOnly dataSource={finalDiffableRule.data_source} />;
    case 'eql_query':
      return (
        <EqlQueryReadOnly
          eqlQuery={finalDiffableRule.eql_query}
          dataSource={finalDiffableRule.data_source}
        />
      );
    case 'esql_query':
      return <EsqlQueryReadOnly esqlQuery={finalDiffableRule.esql_query} />;
    case 'kql_query':
      return (
        <KqlQueryReadOnly
          kqlQuery={finalDiffableRule.kql_query}
          dataSource={finalDiffableRule.data_source}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'machine_learning_job_id':
      return (
        <MachineLearningJobIdReadOnly
          machineLearningJobId={finalDiffableRule.machine_learning_job_id}
        />
      );
    default:
      return assertUnreachable(fieldName);
  }
}
