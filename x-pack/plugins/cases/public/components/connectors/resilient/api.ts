/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../actions/common';
import { getExecuteConnectorUrl } from '../../../../common/utils/connectors_api';
import { ResilientIncidentTypes, ResilientSeverity } from './types';

export const BASE_ACTION_API_PATH = '/api/actions';

export interface Props {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}

export async function getIncidentTypes({ http, signal, connectorId }: Props) {
  return http.post<ActionTypeExecutorResult<ResilientIncidentTypes>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'incidentTypes', subActionParams: {} },
      }),
      signal,
    }
  );
}

export async function getSeverity({ http, signal, connectorId }: Props) {
  return http.post<ActionTypeExecutorResult<ResilientSeverity>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'severity', subActionParams: {} },
      }),
      signal,
    }
  );
}
