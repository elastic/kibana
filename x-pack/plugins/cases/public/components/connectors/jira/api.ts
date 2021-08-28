/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import type { ActionTypeExecutorResult } from '../../../../../actions/common/types';
import { getExecuteConnectorUrl } from '../../../../common/utils/connectors_api';
import type { Fields, Issue, Issues, IssueTypes } from './types';

export interface GetIssueTypesProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}

export async function getIssueTypes({ http, signal, connectorId }: GetIssueTypesProps) {
  return http.post<ActionTypeExecutorResult<IssueTypes>>(getExecuteConnectorUrl(connectorId), {
    body: JSON.stringify({
      params: { subAction: 'issueTypes', subActionParams: {} },
    }),
    signal,
  });
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
  return http.post(getExecuteConnectorUrl(connectorId), {
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
  return http.post(getExecuteConnectorUrl(connectorId), {
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
  return http.post(getExecuteConnectorUrl(connectorId), {
    body: JSON.stringify({
      params: { subAction: 'issue', subActionParams: { id } },
    }),
    signal,
  });
}
