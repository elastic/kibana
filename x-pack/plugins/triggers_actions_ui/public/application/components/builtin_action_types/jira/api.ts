/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';

export async function getIssueTypes({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'issueTypes', subActionParams: {} },
    }),
    signal,
  });
}

export async function getFieldsByIssueType({
  http,
  signal,
  connectorId,
  id,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  id: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'fieldsByIssueType', subActionParams: { id } },
    }),
    signal,
  });
}

export async function getIssues({
  http,
  signal,
  connectorId,
  title,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  title: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'issues', subActionParams: { title } },
    }),
    signal,
  });
}

export async function getIssue({
  http,
  signal,
  connectorId,
  id,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  id: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'issue', subActionParams: { id } },
    }),
    signal,
  });
}
