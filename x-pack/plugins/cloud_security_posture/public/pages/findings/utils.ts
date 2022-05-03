/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import type { FindingsBaseEsQuery, FindingsBaseURLQuery } from './types';

export const getBaseQuery = ({
  dataView,
  query,
  filters,
}: FindingsBaseURLQuery & { dataView: DataView }): FindingsBaseEsQuery => ({
  index: dataView.title,
  // TODO: this will throw for malformed query
  // page will display an error boundary with the JS error
  // will be accounted for before releasing the feature
  query: buildEsQuery(dataView, query, filters),
});
