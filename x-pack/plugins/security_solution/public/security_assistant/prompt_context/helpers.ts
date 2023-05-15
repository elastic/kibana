/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../common/search_strategy';
import type { Rule } from '../../detection_engine/rule_management/logic';

export interface QueryField {
  field: string;
  values: string;
}

export const getAllFields = (data: TimelineEventsDetailsItem[]): QueryField[] =>
  data
    .filter(({ field }) => !field.startsWith('signal.'))
    .map(({ field, values }) => ({ field, values: values?.join(',') ?? '' }));

export const getFieldsAsCsv = (queryFields: QueryField[]): string =>
  queryFields.map(({ field, values }) => `${field},${values}`).join('\n');

export const getPromptContextFromEventDetailsItem = (data: TimelineEventsDetailsItem[]): string => {
  const allFields = getAllFields(data);

  return getFieldsAsCsv(allFields);
};

export const getPromptContextFromDetectionRules = (rules: Rule[]): string => {
  const data = rules.map((rule) => `Rule Name:${rule.name}\nRule Description:${rule.description}`);

  return data.join('\n\n');
};
