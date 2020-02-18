/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { alertStateSchema } from '../../../../alerting/common';
import { BASE_ALERT_API_PATH } from '../constants';
import { Alert, AlertType, AlertWithoutId, AlertTaskState } from '../../types';

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<AlertType[]> {
  return await http.get(`${BASE_ALERT_API_PATH}/types`);
}

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Alert> {
  return await http.get(`${BASE_ALERT_API_PATH}/${alertId}`);
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
    .get(`${BASE_ALERT_API_PATH}/${alertId}/state`)
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

export async function loadAlerts({
  http,
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
}: {
  http: HttpSetup;
  page: { index: number; size: number };
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}> {
  const filters = [];
  if (typesFilter && typesFilter.length) {
    filters.push(`alert.attributes.alertTypeId:(${typesFilter.join(' or ')})`);
  }
  if (actionTypesFilter && actionTypesFilter.length) {
    filters.push(
      [
        '(',
        actionTypesFilter.map(id => `alert.attributes.actions:{ actionTypeId:${id} }`).join(' OR '),
        ')',
      ].join('')
    );
  }
  return await http.get(`${BASE_ALERT_API_PATH}/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? JSON.stringify(['name', 'tags']) : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' and ') : undefined,
      default_search_operator: 'AND',
    },
  });
}

export async function deleteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.delete(`${BASE_ALERT_API_PATH}/${id}`);
}

export async function deleteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map(id => deleteAlert({ http, id })));
}

export async function createAlert({
  http,
  alert,
}: {
  http: HttpSetup;
  alert: Omit<AlertWithoutId, 'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds'>;
}): Promise<Alert> {
  return await http.post(`${BASE_ALERT_API_PATH}`, {
    body: JSON.stringify(alert),
  });
}

export async function updateAlert({
  http,
  alert,
  id,
}: {
  http: HttpSetup;
  alert: Pick<AlertWithoutId, 'throttle' | 'name' | 'tags' | 'schedule' | 'params' | 'actions'>;
  id: string;
}): Promise<Alert> {
  return await http.put(`${BASE_ALERT_API_PATH}/${id}`, {
    body: JSON.stringify(alert),
  });
}

export async function enableAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/${id}/_enable`);
}

export async function enableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map(id => enableAlert({ id, http })));
}

export async function disableAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/${id}/_disable`);
}

export async function disableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map(id => disableAlert({ id, http })));
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
  await http.post(`${BASE_ALERT_API_PATH}/${id}/alert_instance/${instanceId}/_mute`);
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
  await http.post(`${BASE_ALERT_API_PATH}/${id}/alert_instance/${instanceId}/_unmute`);
}

export async function muteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/${id}/_mute_all`);
}

export async function muteAlerts({ ids, http }: { ids: string[]; http: HttpSetup }): Promise<void> {
  await Promise.all(ids.map(id => muteAlert({ http, id })));
}

export async function unmuteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERT_API_PATH}/${id}/_unmute_all`);
}

export async function unmuteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map(id => unmuteAlert({ id, http })));
}
