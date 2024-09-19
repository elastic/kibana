/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableCustomQueryFields } from '../../../../../../../common/api/detection_engine';
import { DataSourceReadOnly } from './fields/data_source/data_source';
import { KqlQueryReadOnly } from './fields/kql_query';
// import { assertUnreachable } from '../../../../../../../common/utility_types';
import { TypeReadOnly } from './fields/type/type';

interface CustomQueryRuleFieldReadOnlyProps {
  fieldName: keyof DiffableCustomQueryFields;
  finalDiffableRule: DiffableCustomQueryFields;
}

export function CustomQueryRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: CustomQueryRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'data_source':
      return <DataSourceReadOnly dataSource={finalDiffableRule.data_source} />;
    case 'kql_query':
      return (
        <KqlQueryReadOnly
          kqlQuery={finalDiffableRule.kql_query}
          dataSource={finalDiffableRule.data_source}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
    // return assertUnreachable(fieldName);
  }
}
