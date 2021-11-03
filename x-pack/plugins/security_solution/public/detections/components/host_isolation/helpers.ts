/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { find } from 'lodash/fp';

import type { TimelineEventsDetailsItem } from '../../../../common';

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
  return find({ category, field }, data)?.values;
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
