/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingAuditLog,
  ALERTING_AUDIT_FIND_PATH,
  AlertingAuditLogRaw,
} from '@kbn/alerting-plugin/common';
import { HttpSetup } from '@kbn/core-http-browser';
import { Pagination } from '@elastic/eui';
import { KueryNode } from '@kbn/es-query';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { Sorting } from '../../../types';

export interface LoadAuditProps {
  http: HttpSetup;
  page: Pagination;
  sort?: Sorting;
  search?: string;
  filter?: string | KueryNode;
}

interface FindApiResponse {
  data: AlertingAuditLogRaw[];
  total: number;
}

interface FindResponse {
  data: AlertingAuditLog[];
  total: number;
}

const rewriteBodyRes = ({ total, data }: FindApiResponse) => {
  return {
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
}: LoadAuditProps): Promise<FindResponse> {
  const result = await http.post<AsApiContract<FindApiResponse>>(ALERTING_AUDIT_FIND_PATH, {
    body: JSON.stringify({
      page: page.pageIndex + 1,
      per_page: page.pageSize,
      sort_field: sort.field,
      sort_order: sort.direction,
      search,
      filter,
    }),
  });

  return rewriteBodyRes(result);
}
