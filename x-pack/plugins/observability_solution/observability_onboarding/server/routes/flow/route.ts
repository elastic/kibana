/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import {
  NamingCollisionError,
  FleetUnauthorizedError,
  type PackageClient,
} from '@kbn/fleet-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { dump } from 'js-yaml';
import { getObservabilityOnboardingFlow, saveObservabilityOnboardingFlow } from '../../lib/state';
import {
  ElasticAgentStepPayload,
  ObservabilityOnboardingFlow,
} from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getHasLogs } from './get_has_logs';
import { getSystemLogsDataStreams } from '../../../common/elastic_agent_logs';

import { getFallbackESUrl } from '../../lib/get_fallback_urls';

const updateOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'PUT /internal/observability_onboarding/flow/{onboardingId}',
  options: { tags: [], xsrfRequired: false },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.partial({
      state: t.record(t.string, t.unknown),
    }),
  }),
  async handler(resources): Promise<{ onboardingId: string }> {
    const {
      params: {
        path: { onboardingId },
        body: { state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const { id } = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
      observabilityOnboardingState: {
        type: 'logFiles',
        state,
        progress: {},
      } as ObservabilityOnboardingFlow,
    });
    return { onboardingId: id };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow/{id}/step/{name}',
  options: { tags: [], xsrfRequired: false },
  params: t.type({
    path: t.type({
      id: t.string,
      name: t.string,
    }),
    body: t.intersection([
      t.type({
        status: t.string,
      }),
      t.partial({ message: t.string }),
      t.partial({ payload: t.record(t.string, t.unknown) }),
    ]),
  }),
  async handler(resources) {
    const {
      params: {
        path: { id, name },
        body: { status, message, payload },
      },
      core,
    } = resources;

    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: id,
    });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound('Unable to report setup progress - onboarding session not found.');
    }

    const {
      id: savedObjectId,
      updatedAt,
      ...observabilityOnboardingState
    } = savedObservabilityOnboardingState;

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId,
      observabilityOnboardingState: {
        ...observabilityOnboardingState,
        progress: {
          ...observabilityOnboardingState.progress,
          [name]: {
            status,
            message,
            payload: payload as unknown as ElasticAgentStepPayload,
          },
        },
      },
    });
    return { name, status, message, payload };
  },
});

const getProgressRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
  options: { tags: [], xsrfRequired: false },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
  }),
  async handler(resources): Promise<{
    progress: Record<string, { status: string; message?: string }>;
  }> {
    const {
      params: {
        path: { onboardingId },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
    });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound('Unable to report setup progress - onboarding session not found.');
    }

    const progress = { ...savedObservabilityOnboardingState?.progress };

    const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

    const type = savedObservabilityOnboardingState.type;

    if (progress['ea-status']?.status === 'complete') {
      try {
        const hasLogs = await getHasLogs({
          type,
          state: savedObservabilityOnboardingState.state,
          esClient,
          payload: progress['ea-status']?.payload,
        });
        if (hasLogs) {
          progress['logs-ingest'] = { status: 'complete' };
        } else {
          progress['logs-ingest'] = { status: 'loading' };
        }
      } catch (error) {
        progress['logs-ingest'] = { status: 'warning', message: error.message };
      }
    } else {
      progress['logs-ingest'] = { status: 'incomplete' };
    }

    return { progress };
  },
});

/**
 * This endpoints installs the requested integrations and returns the corresponding config file for Elastic Agent.
 *
 * The request/response format is TSV (tab-separated values) to simplify parsing in bash.
 *
 * Example request:
 *
 * ```text
 * POST /internal/observability_onboarding/flow/${ONBOARDING_ID}/integrations/install
 *
 * system registry
 * product_service custom /path/to/access.log
 * product_service custom /path/to/error.log
 * checkout_service custom /path/to/access.log
 * checkout_service custom /path/to/error.log
 * ```
 *
 * Example curl:
 *
 * ```bash
 * curl --request POST \
 *  --url "http://localhost:5601/internal/observability_onboarding/flow/${ONBOARDING_ID}/integrations/install" \
 *  --header "Authorization: ApiKey ${ENCODED_API_KEY}" \
 *  --header "Content-Type: text/tab-separated-values" \
 *  --data $'system\tregistry\nproduct_service\tcustom\t/path/to/access.log\ncheckout_service\tcustom\t/path/to/access.log'
 * ```
 */
const integrationsInstallRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow/{onboardingId}/integrations/install',
  options: { tags: [], xsrfRequired: false },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.string,
  }),
  async handler({ context, request, response, params, core, plugins, services }) {
    const coreStart = await core.start();
    const fleetStart = await plugins.fleet.start();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository();
    const packageClient = fleetStart.packageService.asScoped(request);

    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: params.path.onboardingId,
    });
    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound(`Onboarding session '${params.path.onboardingId}' not found.`);
    }

    const integrationsToInstall = parseIntegrationsTSV(params.body);
    if (!integrationsToInstall.length) {
      return response.badRequest({
        body: {
          message: 'Please specify a list of integrations to install',
        },
      });
    }

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: params.path.onboardingId,
      observabilityOnboardingState: {
        ...savedObservabilityOnboardingState,
        type: 'logFiles',
        progress: {},
      } as ObservabilityOnboardingFlow,
    });

    let agentInputs: unknown[];
    try {
      agentInputs = await ensureInstalledIntegrations(integrationsToInstall, packageClient);
    } catch (error) {
      if (error instanceof FleetUnauthorizedError) {
        return response.forbidden({
          body: {
            message: error.message,
          },
        });
      }
      throw error;
    }

    const elasticsearchUrl = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return response.ok({
      headers: {
        'content-type': 'application/yaml',
      },
      body: generateAgentConfig({
        esHost: elasticsearchUrl,
        inputs: agentInputs,
      }),
    });
  },
});

type Integration =
  | {
      pkgName: string;
      installSource: 'registry';
    }
  | {
      pkgName: string;
      installSource: 'custom';
      logFilePaths: string[];
    };

async function ensureInstalledIntegrations(
  integrationsToInstall: Integration[],
  packageClient: PackageClient
) {
  const agentInputs: unknown[] = [];
  for (const integration of integrationsToInstall) {
    const { pkgName, installSource } = integration;
    if (installSource === 'registry') {
      await packageClient.ensureInstalledPackage({ pkgName });
      agentInputs.push(...getSystemLogsDataStreams(uuidv4()));
    } else if (installSource === 'custom') {
      const input = {
        id: `custom-logs-${uuidv4()}`,
        type: 'logfile',
        data_stream: {
          namespace: 'default',
        },
        streams: [
          {
            id: `logs-onboarding-${pkgName}`,
            data_stream: {
              dataset: pkgName,
            },
            paths: integration.logFilePaths,
          },
        ],
      };
      try {
        await packageClient.installCustomIntegration({
          pkgName,
          datasets: [{ name: pkgName, type: 'logs' }],
        });
        agentInputs.push(input);
      } catch (error) {
        // If the error is a naming collision, we can assume the integration is already installed and treat this step as successful
        if (error instanceof NamingCollisionError) {
          agentInputs.push(input);
        } else {
          throw error;
        }
      }
    }
  }
  return agentInputs;
}

/**
 * Parses and validates a TSV (tab-separated values) string of integrations with params.
 *
 * Returns an object of integrations to install.
 *
 * Example input:
 *
 * ```text
 * system registry
 * product_service custom /path/to/access.log
 * product_service custom /path/to/error.log
 * checkout_service custom /path/to/access.log
 * checkout_service custom /path/to/error.log
 * ```
 */
function parseIntegrationsTSV(tsv: string) {
  return Object.values(
    tsv
      .split('\n')
      .map((line) => line.split('\t', 3))
      .reduce<Record<string, Integration>>((acc, [pkgName, installSource, logFilePath]) => {
        if (installSource === 'registry') {
          if (logFilePath) {
            throw new Error(`Integration '${pkgName}' does not support a file path`);
          }
          acc[pkgName] = {
            pkgName,
            installSource,
          };
          return acc;
        } else if (installSource === 'custom') {
          if (!logFilePath) {
            throw new Error(`Missing file path for integration: ${pkgName}`);
          }
          // Append file path if integration is already in the list
          const existing = acc[pkgName];
          if (existing && existing.installSource === 'custom') {
            existing.logFilePaths.push(logFilePath);
            return acc;
          }
          acc[pkgName] = {
            pkgName,
            installSource,
            logFilePaths: [logFilePath],
          };
          return acc;
        }
        throw new Error(`Invalid install source: ${installSource}`);
      }, {})
  );
}

const generateAgentConfig = ({ esHost, inputs = [] }: { esHost: string[]; inputs: unknown[] }) => {
  return dump({
    outputs: {
      default: {
        type: 'elasticsearch',
        hosts: esHost,
        api_key: '${API_KEY}', // Placeholder to be replaced by bash script with the actual API key
      },
    },
    inputs,
  });
};

export const flowRouteRepository = {
  ...updateOnboardingFlowRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
  ...integrationsInstallRoute,
};
