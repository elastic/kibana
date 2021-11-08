/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../actions/common';
import { getExecuteConnectorUrl } from '../../../../common/utils';
import {
  ConnectorExecutorResult,
  rewriteResponseToCamelCase,
} from '../rewrite_response_to_camel_case';
import { IssueTypes, Fields, Issues, Issue } from './types';

export interface GetIssueTypesProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}

export async function getIssueTypes({ http, signal, connectorId }: GetIssueTypesProps) {
  const res = await http.post<ConnectorExecutorResult<IssueTypes>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'issueTypes', subActionParams: {} },
      }),
      signal,
    }
  );

  return rewriteResponseToCamelCase(res);
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
  const res = await http.post<ConnectorExecutorResult<Fields>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'fieldsByIssueType', subActionParams: { id } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
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
  const res = await http.post<ConnectorExecutorResult<Issues>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'issues', subActionParams: { title } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
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
  const res = await http.post<ConnectorExecutorResult<Issue>>(getExecuteConnectorUrl(connectorId), {
    body: JSON.stringify({
      params: { subAction: 'issue', subActionParams: { id } },
    }),
    signal,
  });
  return rewriteResponseToCamelCase(res);
}
