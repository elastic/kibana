/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  ChatRegistrationFunction,
  RegisterFunction,
} from '@kbn/observability-ai-assistant-plugin/server/service/types';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { registerGetObservabilitySLOFunction } from './get_observability_slo';

export interface FunctionRegistrationParameters {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  registerFunction: RegisterFunction;
}

export function registerAssistantFunctions({
  spaces,
  logger,
}: {
  spaces?: SpacesPluginStart;
  logger: Logger;
}): ChatRegistrationFunction {
  return async ({ resources, registerContext, registerFunction }) => {
    const spaceId =
      (await spaces?.spacesService?.getActiveSpace(resources.request))?.id ?? 'default';

    const soClient = (await resources.context.core).savedObjects.client;
    const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;

    registerGetObservabilitySLOFunction({
      soClient,
      esClient,
      spaceId,
      logger,
      registerFunction,
    });

    registerContext({
      name: 'observability',
      description: `
      When analyzing Observability, prefer the Observability specific functions over the generic Lens,
      Elasticsearch, APM, Infrastructure or Kibana ones, unless those are explicitly requested by the user.

      Observability includes: SLO.

      When requesting SLOs, make sure you also know what is the service name.

      There are important fields in SLO:
      - slo.id: the id of the SLO
      - slo.name: the name of the SLO
      - slo.status: the status of the SLO
      - sli.value: metric used to keep in check the health of a service
      - slo.error_budget: the error budget of the SLO

      SLO status could be: VIOLATED, WARNING, OK, NO_DATA.
      SLO error budget contains the initial, consumed and remaining error budget. It could also have a boolean to tell whether these values are estimated
      

      Your task is to help users understand the SLOs and how they are impacting their APM services.
  `,
    });
  };
}
