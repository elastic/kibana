/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { HttpSetup } from '@kbn/core/public';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  IExecutionLog,
  ExecutionLogSortFields,
  IExecutionLogResult,
} from '@kbn/alerting-plugin/common';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { getFilter } from './get_filter';

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

const rewriteBodyRes: RewriteRequestCase<IExecutionLogResult> = ({ data, ...rest }: any) => ({
  data: data.map((log: IExecutionLog) => getRenamedLog(log)),
  ...rest,
});

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
  outcomeFilter?: string[];
  ruleTypeIds?: string[];
  message?: string;
  perPage?: number;
  page?: number;
  sort?: SortField[];
}

export type LoadGlobalExecutionLogAggregationsProps = Omit<
  LoadExecutionLogAggregationsProps,
  'id'
> & { namespaces?: Array<string | undefined> };

export const loadExecutionLogAggregations = async ({
  id,
  http,
  dateStart,
  dateEnd,
  outcomeFilter,
  ruleTypeIds,
  message,
  perPage = 10,
  page = 0,
  sort = [],
}: LoadExecutionLogAggregationsProps & { http: HttpSetup }) => {
  const sortField: any[] = sort;
  const filter = getFilter({ outcomeFilter, message, ruleTypeIds });

  const result = await http.get<AsApiContract<IExecutionLogResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/_execution_log`,
    {
      query: {
        date_start: dateStart,
        date_end: dateEnd,
        filter: filter.length ? filter.join(' and ') : undefined,
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

export const loadGlobalExecutionLogAggregations = async ({
  http,
  dateStart,
  dateEnd,
  outcomeFilter,
  ruleTypeIds,
  message,
  perPage = 10,
  page = 0,
  sort = [],
  namespaces,
}: LoadGlobalExecutionLogAggregationsProps & { http: HttpSetup }) => {
  const sortField: any[] = sort;
  const filter = getFilter({ outcomeFilter, message, ruleTypeIds });

  const result = await http.get<AsApiContract<IExecutionLogResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_logs`,
    {
      query: {
        date_start: dateStart,
        date_end: dateEnd,
        filter: filter.length ? filter.join(' and ') : undefined,
        per_page: perPage,
        // Need to add the + 1 for pages because APIs are 1 indexed,
        // whereas data grid sorts are 0 indexed.
        page: page + 1,
        sort: sortField.length ? JSON.stringify(sortField) : undefined,
        namespaces: namespaces ? JSON.stringify(namespaces) : undefined,
      },
    }
  );

  return rewriteBodyRes(result);
};
