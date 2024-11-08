/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { AGENTS_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import { API_VERSIONS } from '../../../common/constants';

import type { FleetConfigType } from '../../../common/types';

import { genericErrorResponse, internalErrorResponse } from '../schema/errors';

import { getFleetStatusHandler, fleetSetupHandler } from './handlers';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { agentPolicyService } from '../../services';
import { FleetRequestHandler } from '../../types';

export const FleetSetupResponseSchema = schema.object(
  {
    isInitialized: schema.boolean(),
    nonFatalErrors: schema.arrayOf(
      schema.object({
        name: schema.string(),
        message: schema.string(),
      })
    ),
  },
  {
    meta: {
      description:
        "A summary of the result of Fleet's `setup` lifecycle. If `isInitialized` is true, Fleet is ready to accept agent enrollment. `nonFatalErrors` may include useful insight into non-blocking issues with Fleet setup.",
    },
  }
);

async function createAgentEnrichment(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
) {
  // Sync agent policies in a new index that will be used for enrichment
  // This could happen in the agent policy service when policies are created/updated
  const agentPoliciesData = await agentPolicyService.list(soClient, {
    perPage: 10000,
  });

  for (const agentPolicy of agentPoliciesData.items) {
    await esClient.index({
      index: 'fleet-agent-policy-enrich',
      id: agentPolicy.id,
      document: {
        policy_id: agentPolicy.id,
        is_managed: agentPolicy.is_managed,
        data_output_id: agentPolicy.data_output_id,
        monitoring_output_id: agentPolicy.monitoring_output_id,
      },
    });
  }

  // Create the enrich policy and pipeline, this should probably be part the ES fleet plugin if move forward with that
  await esClient.enrich
    .putPolicy({
      name: 'fleet-agent-policy',
      match: {
        indices: 'fleet-agent-policy-enrich',
        match_field: 'policy_id',
        enrich_fields: ['is_managed', 'data_output_id', 'monitoring_output_id'],
      },
    })
    // Catch if already exists
    .catch(() => {});

  await esClient.enrich.executePolicy({
    name: 'fleet-agent-policy',
  });

  await esClient.ingest.putPipeline({
    id: 'fleet-agents-pipeline',
    processors: [
      {
        enrich: {
          description: "Add 'user' data based on 'email'",
          policy_name: 'fleet-agent-policy',
          field: 'policy_id',
          target_field: 'agent_policy',
          max_matches: 1,
        },
      },
    ],
  });

  // Hacky way to tests copy .fleet-agents in a .fleet-agents-test as we cannot update settings (index.default_pipeline) of a system indices
  const agentRes = await esClient.search({
    index: '.fleet-agents',
    size: 10000,
  });

  for (const agentDoc of agentRes.hits.hits) {
    await esClient.index({
      index: '.fleet-agents-test',
      id: agentDoc._id,
      document: agentDoc._source,
      pipeline: 'fleet-agents-pipeline',
    });
  }
}

export const registerFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: SETUP_API_ROUTE,
      fleetAuthz: {
        fleet: { setup: true },
      },
      description: `Initiate Fleet setup`,
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => FleetSetupResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
            500: {
              body: internalErrorResponse,
            },
          },
        },
      },
      fleetSetupHandler
    );

  router.versioned
    .post({
      path: '/api/fleet/poc-agent-enrichment',
      fleetAuthz: {
        fleet: { setup: true },
      },
      description: `Initiate Fleet setup`,
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => FleetSetupResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
            500: {
              body: internalErrorResponse,
            },
          },
        },
      },
      testHandler
    );
};

const testHandler: FleetRequestHandler = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const soClient = await (await context.core).savedObjects.client;

  await createAgentEnrichment(esClient, soClient).catch(console.log);

  return response.ok({});
};

export const GetAgentsSetupResponseSchema = schema.object(
  {
    isReady: schema.boolean(),
    missing_requirements: schema.arrayOf(
      schema.oneOf([
        schema.literal('security_required'),
        schema.literal('tls_required'),
        schema.literal('api_keys'),
        schema.literal('fleet_admin_user'),
        schema.literal('fleet_server'),
      ])
    ),
    missing_optional_features: schema.arrayOf(
      schema.oneOf([schema.literal('encrypted_saved_object_encryption_key_required')])
    ),
    package_verification_key_id: schema.maybe(schema.string()),
    is_space_awareness_enabled: schema.maybe(schema.boolean()),
    is_secrets_storage_enabled: schema.maybe(schema.boolean()),
  },
  {
    meta: {
      description:
        'A summary of the agent setup status. `isReady` indicates whether the setup is ready. If the setup is not ready, `missing_requirements` lists which requirements are missing.',
    },
  }
);

// That route is used by agent to setup Fleet
export const registerCreateFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { setup: true },
      },
      description: `Initiate agent setup`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => FleetSetupResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      fleetSetupHandler
    );
};

export const registerGetFleetStatusRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { setup: true },
      },
      description: `Get agent setup info`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => GetAgentsSetupResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getFleetStatusHandler
    );
};

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Ingest manager setup
  registerFleetSetupRoute(router);

  if (!config.agents.enabled) {
    return;
  }

  // Get Fleet setup
  registerGetFleetStatusRoute(router);

  // Create Fleet setup
  registerCreateFleetSetupRoute(router);
};
