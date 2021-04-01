/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { AlertExecutionStatus } from '../../../../../alerting/common';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { Alert, AlertAction, Pagination, Sorting } from '../../../types';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';
import { mapFiltersToKql } from './mapFiltersToKql';

const transformAction: RewriteRequestCase<AlertAction> = ({
  group,
  id,
  connector_type_id: actionTypeId,
  params,
}) => ({
  group,
  id,
  params,
  actionTypeId,
});

const transformExecutionStatus: RewriteRequestCase<AlertExecutionStatus> = ({
  last_execution_date: lastExecutionDate,
  ...rest
}) => ({
  lastExecutionDate,
  ...rest,
});

const rewriteResponseRes = (results: Array<AsApiContract<Alert>>): Alert[] => {
  return results.map((item) => {
    const actions = item.actions.map((action) => transformAction(action as any));
    const executionStatus = transformExecutionStatus(item.execution_status as any);
    return transformAlert({ ...item, actions, execution_status: executionStatus });
  });
};

const transformAlert: RewriteRequestCase<Alert> = ({
  rule_type_id: alertTypeId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  scheduled_task_id: scheduledTaskId,
  execution_status: executionStatus,
  actions: actions,
  ...rest
}: any) => ({
  alertTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus,
  actions,
  scheduledTaskId,
  ...rest,
});

export async function loadAlerts({
  http,
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
  sort = { field: 'name', direction: 'asc' },
}: {
  http: HttpSetup;
  page: Pagination;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
  sort?: Sorting;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, alertStatusesFilter });
  const res = await http.get(`${BASE_ALERTING_API_PATH}/rules/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
      sort_field: sort.field,
      sort_order: sort.direction,
    },
  });
  return {
    page: res.page,
    perPage: res.per_page,
    total: res.total,
    data: rewriteResponseRes(res.data),
  };
}
