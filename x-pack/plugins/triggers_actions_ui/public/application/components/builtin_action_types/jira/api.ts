/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../../actions/common';
import { BASE_ACTION_API_PATH } from '../../../constants';
import { rewriteResponseToCamelCase } from '../rewrite_response_body';
import { Fields, Issue, Issues, IssueTypes } from '../types';

export async function getIssueTypes({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<ActionTypeExecutorResult<IssueTypes>> {
  return await http
    .post(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`, {
      body: JSON.stringify({
        params: { subAction: 'issueTypes', subActionParams: {} },
      }),
      signal,
    })
    .then((res) => rewriteResponseToCamelCase(res));
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
}): Promise<ActionTypeExecutorResult<Fields>> {
  return await http
    .post(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`, {
      body: JSON.stringify({
        params: { subAction: 'fieldsByIssueType', subActionParams: { id } },
      }),
      signal,
    })
    .then((res) => rewriteResponseToCamelCase(res));
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
}): Promise<ActionTypeExecutorResult<Issues>> {
  return await http
    .post(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`, {
      body: JSON.stringify({
        params: { subAction: 'issues', subActionParams: { title } },
      }),
      signal,
    })
    .then((res) => rewriteResponseToCamelCase(res));
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
}): Promise<ActionTypeExecutorResult<Issue>> {
  return await http
    .post(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`, {
      body: JSON.stringify({
        params: { subAction: 'issue', subActionParams: { id } },
      }),
      signal,
    })
    .then((res) => rewriteResponseToCamelCase(res));
}
