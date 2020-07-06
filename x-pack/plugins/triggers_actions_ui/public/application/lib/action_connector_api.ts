/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';
import { ActionConnector, ActionConnectorWithoutId, ActionType } from '../../types';

export async function loadActionTypes({ http }: { http: HttpSetup }): Promise<ActionType[]> {
  return await http.get(`${BASE_ACTION_API_PATH}/list_action_types`);
}

export async function loadAllActions({ http }: { http: HttpSetup }): Promise<ActionConnector[]> {
  return await http.get(`${BASE_ACTION_API_PATH}`);
}

export async function createActionConnector({
  http,
  connector,
}: {
  http: HttpSetup;
  connector: Omit<ActionConnectorWithoutId, 'referencedByCount'>;
}): Promise<ActionConnector> {
  return await http.post(`${BASE_ACTION_API_PATH}/action`, {
    body: JSON.stringify(connector),
  });
}

export async function updateActionConnector({
  http,
  connector,
  id,
}: {
  http: HttpSetup;
  connector: Pick<ActionConnectorWithoutId, 'name' | 'config' | 'secrets'>;
  id: string;
}): Promise<ActionConnector> {
  return await http.put(`${BASE_ACTION_API_PATH}/action/${id}`, {
    body: JSON.stringify({
      name: connector.name,
      config: connector.config,
      secrets: connector.secrets,
    }),
  });
}

export async function deleteActions({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<{ successes: string[]; errors: string[] }> {
  const successes: string[] = [];
  const errors: string[] = [];
  await Promise.all(ids.map((id) => http.delete(`${BASE_ACTION_API_PATH}/action/${id}`))).then(
    function (fulfilled) {
      successes.push(...fulfilled);
    },
    function (rejected) {
      errors.push(...rejected);
    }
  );
  return { successes, errors };
}
