/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { pick } from 'lodash';
import { alertStateSchema, AlertingFrameworkHealth } from '../../../../alerts/common';
import { BASE_ALERT_API_PATH } from '../constants';
import {
  Alert,
  AlertAggregations,
  AlertType,
  AlertUpdates,
  AlertTaskState,
  AlertInstanceSummary,
} from '../../types';

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<AlertType[]> {
  return await http.get(`${BASE_ALERT_API_PATH}/list_alert_types`);
}

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Alert> {
  return await http.get(`${BASE_ALERT_API_PATH}/alert/${alertId}`);
}

type EmptyHttpResponse = '';
export async function loadAlertState({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertTaskState> {
  return await http
    .get(`${BASE_ALERT_API_PATH}/alert/${alertId}/state`)
    .then((state: AlertTaskState | EmptyHttpResponse) => (state ? state : {}))
    .then((state: AlertTaskState) => {
      return pipe(
        alertStateSchema.decode(state),
        fold((e: t.Errors) => {
          throw new Error(`Alert "${alertId}" has invalid state`);
        }, t.identity)
      );
    });
}

export async function loadAlertInstanceSummary({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertInstanceSummary> {
  return await http.get(`${BASE_ALERT_API_PATH}/alert/${alertId}/_instance_summary`);
}

export const mapFiltersToKql = ({
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
}): string[] => {
  const filters = [];
  if (typesFilter && typesFilter.length) {
    filters.push(`alert.attributes.alertTypeId:(${typesFilter.join(' or ')})`);
  }
  if (actionTypesFilter && actionTypesFilter.length) {
    filters.push(
      [
        '(',
        actionTypesFilter
          .map((id) => `alert.attributes.actions:{ actionTypeId:${id} }`)
          .join(' OR '),
        ')',
      ].join('')
    );
  }
  if (alertStatusesFilter && alertStatusesFilter.length) {
    filters.push(`alert.attributes.executionStatus.status:(${alertStatusesFilter.join(' or ')})`);
  }
  return filters;
};

export async function loadAlerts({
  http,
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
}: {
  http: HttpSetup;
  page: { index: number; size: number };
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, alertStatusesFilter });
  return await http.get(`${BASE_ALERT_API_PATH}/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
      sort_field: 'name.keyword',
      sort_order: 'asc',
    },
  });
}

export async function loadAlertAggregations({
  http,
  searchText,
  typesFilter,
  actionTypesFilter,
  alertStatusesFilter,
}: {
  http: HttpSetup;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  alertStatusesFilter?: string[];
}): Promise<AlertAggregations> {
  const filters = mapFiltersToKql({ typesFilter, actionTypesFilter, alertStatusesFilter });
  return await http.get(`${BASE_ALERT_API_PATH}/_aggregate`, {
    query: {
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
    },
  });
}

export async function deleteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<{ successes: string[]; errors: string[] }> {
  const successes: string[] = [];
  const errors: string[] = [];
  await Promise.all(ids.map((id) => http.delete(`${BASE_ALERT_API_PATH}/alert/${id}`))).then(
    function (fulfilled) {
      successes.push(...fulfilled);
    },
    function (rejected) {
      errors.push(...rejected);
    }
  );
  return { successes, errors };
}

export async function createAlert({
  http,
  alert,
}: {
  http: HttpSetup;
  alert: Omit<
    AlertUpdates,
    'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
  >;
}): Promise<Alert> {
  return await http.post(`${BASE_ALERT_API_PATH}/alert`, {
    body: JSON.stringify(alert),
  });
}

export async function updateAlert({
  http,
  alert,
  id,
}: {
  http: HttpSetup;
  alert: Pick<
    AlertUpdates,
    'throttle' | 'name' | 'tags' | 'schedule' | 'params' | 'actions' | 'notifyOnlyOnActionGroupChange'
  >;
  id: string;
}): Promise<Alert> {
  return await http.put(`${BASE_ALERT_API_PATH}/alert/${id}`, {
    body: JSON.stringify(
      pick(alert, [
        'throttle',
        'name',
        'tags',
        'schedule',
        'params',
        'actions',
        'notifyOnlyOnActionGroupChange',
      ])
    ),
  });
}

export async function enableAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/_enable`);
}

export async function enableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map((id) => enableAlert({ id, http })));
}

export async function disableAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/_disable`);
}

export async function disableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map((id) => disableAlert({ id, http })));
}

export async function muteAlertInstance({
  id,
  instanceId,
  http,
}: {
  id: string;
  instanceId: string;
  http: HttpSetup;
}): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/alert_instance/${instanceId}/_mute`);
}

export async function unmuteAlertInstance({
  id,
  instanceId,
  http,
}: {
  id: string;
  instanceId: string;
  http: HttpSetup;
}): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/alert_instance/${instanceId}/_unmute`);
}

export async function muteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/_mute_all`);
}

export async function muteAlerts({ ids, http }: { ids: string[]; http: HttpSetup }): Promise<void> {
  await Promise.all(ids.map((id) => muteAlert({ http, id })));
}

export async function unmuteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/alert/${id}/_unmute_all`);
}

export async function unmuteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map((id) => unmuteAlert({ id, http })));
}

export async function health({ http }: { http: HttpSetup }): Promise<AlertingFrameworkHealth> {
  return await http.get(`${BASE_ALERT_API_PATH}/_health`);
}
