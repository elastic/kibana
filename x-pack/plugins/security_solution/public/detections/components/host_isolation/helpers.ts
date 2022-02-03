/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { find } from 'lodash/fp';

import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

export const getFieldValues = (
  {
    category,
    field,
  }: {
    category: string;
    field: string;
  },
  data: TimelineEventsDetailsItem[] | null
) => {
  const categoryCompat =
    category === 'signal' ? 'kibana' : category === 'kibana' ? 'signal' : category;
  const fieldCompat =
    category === 'signal'
      ? field.replace('signal', 'kibana.alert').replace('rule.id', 'rule.uuid')
      : category === 'kibana'
      ? field.replace('kibana.alert', 'signal').replace('rule.uuid', 'rule.id')
      : field;
  return (
    find({ category, field }, data)?.values ??
    find({ category: categoryCompat, field: fieldCompat }, data)?.values
  );
};

export const getFieldValue = (
  {
    category,
    field,
  }: {
    category: string;
    field: string;
  },
  data: TimelineEventsDetailsItem[] | null
) => {
  const currentField = getFieldValues({ category, field }, data);
  return currentField && currentField.length > 0 ? currentField[0] : '';
};
