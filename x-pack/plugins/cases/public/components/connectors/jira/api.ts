/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { getExecuteConnectorUrl } from '../../../../common/utils';
import type { ConnectorExecutorResult } from '../rewrite_response_to_camel_case';
import { rewriteResponseToCamelCase } from '../rewrite_response_to_camel_case';
import type { IssueTypes, Fields, Issues, Issue } from './types';

export interface GetIssueTypesProps {
  http: HttpSetup;
  connectorId: string;
  signal?: AbortSignal;
}

export async function getIssueTypes({ http, connectorId, signal }: GetIssueTypesProps) {
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
  connectorId: string;
  id: string;
  signal?: AbortSignal;
}

export async function getFieldsByIssueType({
  http,
  connectorId,
  id,
  signal,
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
  connectorId: string;
  title: string;
  signal?: AbortSignal;
}

export async function getIssues({
  http,
  connectorId,
  title,
  signal,
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
  connectorId: string;
  id: string;
  signal?: AbortSignal;
}

export async function getIssue({
  http,
  connectorId,
  id,
  signal,
}: GetIssueTypeProps): Promise<ActionTypeExecutorResult<Issue>> {
  const res = await http.post<ConnectorExecutorResult<Issue>>(getExecuteConnectorUrl(connectorId), {
    body: JSON.stringify({
      params: { subAction: 'issue', subActionParams: { id } },
    }),
    signal,
  });
  return rewriteResponseToCamelCase(res);
}
