/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { LiveQueryDetailsItem } from '@kbn/osquery-io-ts-types';
import { useKibana } from '../../../common/lib/kibana';
import { OSQUERY_LIVE_QUERY_ROUTE } from '../../../../common/endpoint/constants';

interface OsqueryRequestPayload {
  endpoint_ids: string[];
}

interface OsqueryCommand {
  query?: string[];
  packId?: string[];
  savedQueryId?: string[];
}

export const useSendOsqueryRequest = (commandArgs: OsqueryCommand) => {
  const { executionContext, http } = useKibana().services;
  const queryExecutionContext = executionContext?.get();
  return useMutation<
    { data: LiveQueryDetailsItem },
    { body: { error: string; message: string } },
    OsqueryRequestPayload
  >(async (payload) => {
    return http.post<{ data: LiveQueryDetailsItem }>(OSQUERY_LIVE_QUERY_ROUTE, {
      body: JSON.stringify({
        query: commandArgs.query?.[0],
        pack_id: commandArgs.packId?.[0],
        saved_query_id: commandArgs.savedQueryId?.[0],
        agent_all: false,
        agent_ids: payload.endpoint_ids,
        agent_platforms: [],
        agent_policy_ids: [],
        metadata: { execution_context: queryExecutionContext },
      }),
    });
  }, {});
};
