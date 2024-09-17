/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableEqlFields } from '../../../../../../../common/api/detection_engine';
import { DataSourceReadOnly } from './fields/data_source/data_source';
import { EqlQueryReadOnly } from './fields/eql_query/eql_query';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface EqlRuleFieldReadOnlyProps {
  fieldName: keyof DiffableEqlFields;
  finalDiffableRule: DiffableEqlFields;
}

export function EqlRuleFieldReadOnly({ fieldName, finalDiffableRule }: EqlRuleFieldReadOnlyProps) {
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
    case 'type':
      return null;
    default:
      return assertUnreachable(fieldName);
  }
}
