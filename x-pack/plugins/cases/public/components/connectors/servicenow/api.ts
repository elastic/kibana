/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { getExecuteConnectorUrl } from '../../../../common/utils/connectors_api';
import {
  rewriteResponseToCamelCase,
  SnakedActionTypeExecutorResponse,
} from '../rewrite_request_to_camel_case';
import { Choice } from './types';

export const BASE_ACTION_API_PATH = '/api/actions';

export interface GetChoicesProps {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  fields: string[];
}

export async function getChoices({ http, signal, connectorId, fields }: GetChoicesProps) {
  return http
    .post<SnakedActionTypeExecutorResponse<Choice[]>>(getExecuteConnectorUrl(connectorId), {
      body: JSON.stringify({
        params: { subAction: 'getChoices', subActionParams: { fields } },
      }),
      signal,
    })
    .then((data) => rewriteResponseToCamelCase(data));
}
