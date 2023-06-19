/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanRelation, buildCombinedFilter, buildPhraseFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';

export const buildCombinedHostsFilter = ({
  field,
  values,
  dataView,
}: {
  values: Array<string | number>;
  field: string;
  dataView: DataView | undefined;
}) => {
  if (!dataView) {
    return null;
  }
  const indexField = dataView.getFieldByName(field)!;

  const filtersFromValues = values.map((value) => buildPhraseFilter(indexField, value, dataView));

  const filter = buildCombinedFilter(BooleanRelation.OR, filtersFromValues, dataView);

  return filter;
};
