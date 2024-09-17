/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableThresholdFields } from '../../../../../../../common/api/detection_engine';
import { DataSourceReadOnly } from './fields/data_source/data_source';
import { KqlQueryReadOnly } from './fields/kql_query';

interface ThresholdRuleFieldReadOnlyProps {
  fieldName: keyof DiffableThresholdFields;
  finalDiffableRule: DiffableThresholdFields;
}

export function ThresholdRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: ThresholdRuleFieldReadOnlyProps) {
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
      return null;
    default:
      return null; // Will replace with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
