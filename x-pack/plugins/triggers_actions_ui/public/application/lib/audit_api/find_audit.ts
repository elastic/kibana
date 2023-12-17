/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuditLog, AUDIT_FIND_PATH } from '@kbn/audit-plugin/common';
import { HttpSetup } from '@kbn/core-http-browser';
import { KueryNode } from '@kbn/es-query';
import { FindAuditResponseV1 } from '@kbn/audit-plugin/common/routes/audit/response';
import { Sorting } from '../../../types';

export interface Pagination {
  index: number;
  size: number;
}

export interface LoadAuditProps {
  http: HttpSetup;
  page: Pagination;
  sort?: Sorting;
  search?: string;
  filter?: string | KueryNode;
}

interface LoadAuditByRuleIdResponse {
  page: number;
  perPage: number;
  total: number;
  data: AuditLog[];
}

const rewriteBodyRes = ({ total, data, page, per_page: perPage }: FindAuditResponseV1) => {
  return {
    page,
    perPage,
    total,
    data: data.map(({ subject_id: subjectId, ...rest }) => ({ subjectId, ...rest })),
  };
};

export async function loadAuditByRuleId({
  http,
  page,
  sort = { field: '@timestamp', direction: 'asc' },
  search,
  filter,
}: LoadAuditProps): Promise<LoadAuditByRuleIdResponse> {
  const result = await http.post<FindAuditResponseV1>(AUDIT_FIND_PATH, {
    body: JSON.stringify({
      page: page.index + 1,
      per_page: page.size,
      sort_field: sort.field,
      sort_order: sort.direction,
      search,
      filter,
    }),
  });

  return rewriteBodyRes(result);
}
