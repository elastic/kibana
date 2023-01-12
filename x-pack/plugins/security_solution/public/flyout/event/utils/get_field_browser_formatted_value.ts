/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

// TODO: This is copied and renamed from: x-pack/plugins/security_solution/public/detections/components/host_isolation/helpers.ts
// REPLACE that one

export const getFieldBrowserFormattedValues = (
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

export const getFieldBrowserFormattedValue = (
  {
    category,
    field,
  }: {
    category: string;
    field: string;
  },
  data: TimelineEventsDetailsItem[] | null
) => {
  const currentField = getFieldBrowserFormattedValues({ category, field }, data);
  return currentField && currentField.length > 0 ? currentField[0] : '';
};
