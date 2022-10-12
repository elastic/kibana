/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Criteria } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import { CspFinding } from '../../../common/schemas/csp_finding';

export type FindingsGroupByKind = 'default' | 'resource';

export interface FindingsBaseURLQuery {
  query: Query;
  filters: Filter[];
}

export interface FindingsBaseProps {
  dataView: DataView;
}

export interface FindingsBaseEsQuery {
  query?: {
    bool: BoolQuery;
  };
}

export interface CspFindingsQueryData {
  page: CspFinding[];
  total: number;
}

export type Sort<T> = NonNullable<Criteria<T>['sort']>;
