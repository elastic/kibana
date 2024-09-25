/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableNewTermsFields } from '../../../../../../../common/api/detection_engine';
import { DataSourceReadOnly } from './fields/data_source/data_source';
import { KqlQueryReadOnly } from './fields/kql_query';
import { TypeReadOnly } from './fields/type/type';
import { AlertSuppressionReadOnly } from './fields/alert_suppression/alert_suppression';
import { NewTermsFieldsReadOnly } from './fields/new_terms_fields/new_terms_fields';
import { HistoryWindowStartReadOnly } from './fields/history_window_start/history_window_start';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface NewTermsRuleFieldReadOnlyProps {
  fieldName: keyof DiffableNewTermsFields;
  finalDiffableRule: DiffableNewTermsFields;
}

export function NewTermsRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: NewTermsRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return (
        <AlertSuppressionReadOnly
          alertSuppression={finalDiffableRule.alert_suppression}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'data_source':
      return <DataSourceReadOnly dataSource={finalDiffableRule.data_source} />;
    case 'history_window_start':
      return (
        <HistoryWindowStartReadOnly historyWindowStart={finalDiffableRule.history_window_start} />
      );
    case 'kql_query':
      return (
        <KqlQueryReadOnly
          kqlQuery={finalDiffableRule.kql_query}
          dataSource={finalDiffableRule.data_source}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'new_terms_fields':
      return <NewTermsFieldsReadOnly newTermsFields={finalDiffableRule.new_terms_fields} />;
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
      return assertUnreachable(fieldName);
  }
}
