/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { ActionTypeExecutorResult } from '../../../../../../actions/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { GetApplicationResponse } from '../../../../../../actions/server/builtin_action_types/swimlane/types';
import { BASE_ACTION_API_PATH } from '../../../constants';

export async function getApplication({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<ActionTypeExecutorResult<GetApplicationResponse>> {
  return await http.post(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getApplication', subActionParams: {} },
      }),
      signal,
    }
  );
}
