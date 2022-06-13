/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { HttpSetup } from 'kibana/public';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

import {
  IExecutionLogResult,
  IExecutionLog,
  ExecutionLogSortFields,
} from '../../../../../alerting/common';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';

const getRenamedLog = (data: IExecutionLog) => {
  const {
    duration_ms,
    total_search_duration_ms,
    es_search_duration_ms,
    schedule_delay_ms,
    ...rest
  } = data;

  return {
    execution_duration: data.duration_ms,
    total_search_duration: data.total_search_duration_ms,
    es_search_duration: data.es_search_duration_ms,
    schedule_delay: data.schedule_delay_ms,
    ...rest,
  };
};

const rewriteBodyRes: RewriteRequestCase<IExecutionLogResult> = ({ data, total }: any) => ({
  data: data.map((log: IExecutionLog) => getRenamedLog(log)),
  total,
});

const getFilter = (filter: string[] | undefined) => {
  if (!filter || !filter.length) {
    return;
  }
  return filter.join(' OR ');
};

export type SortField = Record<
  ExecutionLogSortFields,
  {
    order: SortOrder;
  }
>;

export interface LoadExecutionLogAggregationsProps {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string[];
  perPage?: number;
  page?: number;
  sort?: SortField[];
}

export const loadExecutionLogAggregations = async ({
  id,
  http,
  dateStart,
  dateEnd,
  filter,
  perPage = 10,
  page = 0,
  sort = [],
}: LoadExecutionLogAggregationsProps & { http: HttpSetup }) => {
  const sortField: any[] = sort;

  const result = await http.get<AsApiContract<IExecutionLogResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/_execution_log`,
    {
      query: {
        date_start: dateStart,
        date_end: dateEnd,
        filter: getFilter(filter),
        per_page: perPage,
        // Need to add the + 1 for pages because APIs are 1 indexed,
        // whereas data grid sorts are 0 indexed.
        page: page + 1,
        sort: sortField.length ? JSON.stringify(sortField) : undefined,
      },
    }
  );

  return rewriteBodyRes(result);
};
