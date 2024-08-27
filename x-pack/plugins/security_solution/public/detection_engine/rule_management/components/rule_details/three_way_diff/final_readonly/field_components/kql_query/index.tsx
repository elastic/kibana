/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import type {
  DiffableAllFields,
  RuleKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { InlineQuery } from './inline_query';
import { SavedQuery } from './saved_query';
import { assertUnreachable } from '../../../../../../../../../common/utility_types';

interface KqlQueryReadOnlyProps {
  kqlQuery: RuleKqlQuery;
  dataSource: DiffableAllFields['data_source'];
  ruleType: DiffableAllFields['type'];
}

export function KqlQueryReadOnly({ kqlQuery, dataSource, ruleType }: KqlQueryReadOnlyProps) {
  if (kqlQuery.type === KqlQueryType.inline_query) {
    return <InlineQuery kqlQuery={kqlQuery} dataSource={dataSource} />;
  }

  if (kqlQuery.type === KqlQueryType.saved_query) {
    return <SavedQuery kqlQuery={kqlQuery} dataSource={dataSource} ruleType={ruleType} />;
  }

  return assertUnreachable(kqlQuery);
}
