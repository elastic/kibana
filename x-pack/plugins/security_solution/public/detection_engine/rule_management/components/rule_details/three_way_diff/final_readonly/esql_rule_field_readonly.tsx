/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableEsqlFields } from '../../../../../../../common/api/detection_engine';
import { EsqlQueryReadOnly } from './fields/esql_query/esql_query';

interface EsqlRuleFieldReadOnlyProps {
  fieldName: keyof DiffableEsqlFields;
  finalDiffableRule: DiffableEsqlFields;
}

export function EsqlRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: EsqlRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'esql_query':
      return <EsqlQueryReadOnly esqlQuery={finalDiffableRule.esql_query} />;
    case 'type':
      return null;
    default:
      return null; // Will replace with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
