/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../../case/common/api';
import { IssueTypes, Fields } from './types';

export const BASE_ACTION_API_PATH = '/api/actions';

export async function getIssueTypes({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}) {
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
  return http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'fieldsByIssueType', subActionParams: { id } },
    }),
    signal,
  });
}
