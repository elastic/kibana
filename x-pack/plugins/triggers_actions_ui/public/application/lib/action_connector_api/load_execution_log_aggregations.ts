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
  AsApiContract,
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
} from '@kbn/actions-plugin/common';
import { getFilter } from '../rule_api';

const getRenamedLog = (data: IExecutionLog) => {
  const { duration_ms, schedule_delay_ms, ...rest } = data;

  return {
    execution_duration: data.duration_ms,
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

export interface LoadGlobalConnectorExecutionLogAggregationsProps {
  dateStart: string;
  dateEnd?: string;
  outcomeFilter?: string[];
  message?: string;
  perPage?: number;
  page?: number;
  sort?: SortField[];
  namespaces?: Array<string | undefined>;
}

export const loadGlobalConnectorExecutionLogAggregations = async ({
  http,
  dateStart,
  dateEnd,
  outcomeFilter,
  message,
  perPage = 10,
  page = 0,
  sort = [],
  namespaces,
}: LoadGlobalConnectorExecutionLogAggregationsProps & { http: HttpSetup }) => {
  const sortField: any[] = sort;
  const filter = getFilter({ outcomeFilter, message });

  const result = await http.post<AsApiContract<IExecutionLogResult>>(
    `${INTERNAL_BASE_ACTION_API_PATH}/_global_connector_execution_logs`,
    {
      body: JSON.stringify({
        date_start: dateStart,
        date_end: dateEnd,
        filter: filter.length ? filter.join(' and ') : undefined,
        per_page: perPage,
        // Need to add the + 1 for pages because APIs are 1 indexed,
        // whereas data grid sorts are 0 indexed.
        page: page + 1,
        sort: sortField.length ? JSON.stringify(sortField) : undefined,
        namespaces: namespaces ? JSON.stringify(namespaces) : undefined,
      }),
    }
  );

  return rewriteBodyRes(result);
};
