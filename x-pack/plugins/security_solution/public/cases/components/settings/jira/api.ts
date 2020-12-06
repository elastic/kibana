/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../../case/common/api';
import { IssueTypes, Fields, Issues, Issue } from './types';

export const BASE_ACTION_API_PATH = '/api/actions';

export interface GetIssueTypesProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}

export async function getIssueTypes({ http, signal, connectorId }: GetIssueTypesProps) {
  return http.post<ActionTypeExecutorResult<IssueTypes>>(
    `${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'issueTypes', subActionParams: {} },
      }),
      signal,
    }
  );
}

export interface GetFieldsByIssueTypeProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  id: string;
}

export async function getFieldsByIssueType({
  http,
  signal,
  connectorId,
  id,
}: GetFieldsByIssueTypeProps): Promise<ActionTypeExecutorResult<Fields>> {
  return http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'fieldsByIssueType', subActionParams: { id } },
    }),
    signal,
  });
}

export interface GetIssuesTypeProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  title: string;
}

export async function getIssues({
  http,
  signal,
  connectorId,
  title,
}: GetIssuesTypeProps): Promise<ActionTypeExecutorResult<Issues>> {
  return http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'issues', subActionParams: { title } },
    }),
    signal,
  });
}

export interface GetIssueTypeProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  id: string;
}

export async function getIssue({
  http,
  signal,
  connectorId,
  id,
}: GetIssueTypeProps): Promise<ActionTypeExecutorResult<Issue>> {
  return http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'issue', subActionParams: { id } },
    }),
    signal,
  });
}
