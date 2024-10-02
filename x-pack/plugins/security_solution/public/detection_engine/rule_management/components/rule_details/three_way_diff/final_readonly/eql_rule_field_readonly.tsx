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
import { TypeReadOnly } from './fields/type/type';
import { AlertSuppressionReadOnly } from './fields/alert_suppression/alert_suppression';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { EventCategoryOverrideReadOnly } from './fields/event_category_override/event_category_override';
import { TimestampFieldReadOnly } from './fields/timestamp_field/timestamp_field';
import { TiebreakerFieldReadOnly } from './fields/tiebreaker_field/tiebreaker_field';

interface EqlRuleFieldReadOnlyProps {
  fieldName: keyof DiffableEqlFields;
  finalDiffableRule: DiffableEqlFields;
}

export function EqlRuleFieldReadOnly({ fieldName, finalDiffableRule }: EqlRuleFieldReadOnlyProps) {
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
    case 'eql_query':
      return (
        <EqlQueryReadOnly
          eqlQuery={finalDiffableRule.eql_query}
          dataSource={finalDiffableRule.data_source}
        />
      );
    case 'event_category_override':
      return (
        <EventCategoryOverrideReadOnly
          eventCategoryOverride={finalDiffableRule.event_category_override}
        />
      );
    case 'tiebreaker_field':
      return <TiebreakerFieldReadOnly tiebreakerField={finalDiffableRule.tiebreaker_field} />;
    case 'timestamp_field':
      return <TimestampFieldReadOnly timestampField={finalDiffableRule.timestamp_field} />;
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
      return assertUnreachable(fieldName);
  }
}
