/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';

export async function getCreateIssueMetadata({
  http,
  connectorId,
}: {
  http: HttpSetup;
  connectorId: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/${connectorId}/_execute`, {
    body: JSON.stringify({
      params: { subAction: 'getCreateIssueMetadata', subActionParams: {} },
    }),
  });
}
