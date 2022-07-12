/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionHandler } from '..';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export interface OsqueryActionParams {
  agentIds: string[];
  query: string;
  ecs_mapping: Record<string, Record<'field', string>>;
  id?: string;
}
export const OsqueryCreateAction = async (
  payload: { osqueryContext: OsqueryAppContext },
  params: OsqueryActionParams
) => {
  const { query, ecs_mapping: ecsMapping, id, agentIds } = params;

  const [coreStartServices] = await payload.osqueryContext.getStartServices();

  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;

  const response = await createActionHandler(esClientInternal, {
    agents: agentIds,
    query: {
      id,
      query,
      ecs_mapping: ecsMapping,
    },
  });

  return { status: 'ok', data: response };
};
