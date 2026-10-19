/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM data for a high number of OpenTelemetry services (default 2000)
 * connected by distributed traces so the Service Map shows meaningful edges.
 *
 * Topology (default: 2000 services, cluster size 10):
 *
 *   200 "gateway" services  →  1800 "backend" services
 *
 *   Each gateway calls:
 *     - its own 9 cluster-backends  (intra-cluster exit spans)
 *     - 2 neighbouring gateway services  (inter-cluster exit spans)
 *
 *   This produces ~1 800 intra-cluster + ~400 inter-cluster service-map edges.
 *
 * APM display limits (both configurable via Stack Management → Advanced Settings):
 *   - Services Inventory cap: observability:apmMaxNumberOfServices (default 1 000, max 5 000).
 *     Raise to ≥ 2 000 to see all services in the inventory.
 *   - Service Map node cap: observability:apmServiceGroupMaxNumberOfServices (default 500).
 *     Raise to ≥ 2 000 before running if the full graph is needed.
 *
 * Usage:
 *   node scripts/synthtrace.js \
 *     x-pack/solutions/observability/plugins/apm/test/scenarios/many_otel_services_distributed.ts \
 *     --target=https://<ES_URL> \
 *     --kibana=https://<KIBANA_URL> \
 *     --apiKey=<ENCODED_API_KEY> \
 *     --from=now-2h --to=now \
 *     --scenarioOpts="services=2000,clusterSize=10,throughput=5"
 *
 * scenarioOpts:
 *   services     — total number of services (default 2000)
 *   clusterSize  — services per cluster; first is the gateway, rest are backends (default 10)
 *   throughput   — gateway transactions per minute (default 5)
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient, getNumberOpt } from '@kbn/synthtrace';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const LANGUAGES = ['go', 'dotnet', 'java', 'python', 'nodejs', 'php'];
const AGENT_VERSIONS: Record<string, string[]> = {
  go: ['1.3.0', '1.2.0', '1.1.0'],
  dotnet: ['1.5.0', '1.4.0', '1.3.0'],
  java: ['2.1.0', '2.0.0', '1.9.0'],
  python: ['0.47b0', '0.46b0', '0.45b0'],
  nodejs: ['0.52.0', '0.51.0', '0.50.0'],
  php: ['1.1.0', '1.0.0', '0.9.0'],
};

function makeInstance(index: number): Instance {
  const language = LANGUAGES[index % LANGUAGES.length];
  const agentVersion = AGENT_VERSIONS[language][index % AGENT_VERSIONS[language].length];
  const agentName = index % 2 === 0 ? `opentelemetry/${language}` : `otlp/${language}/elastic`;

  return apm
    .service({
      name: `${getRandomNameForIndex(index)}-${language}-${index}`,
      environment: ENVIRONMENT,
      agentName,
    })
    .instance(`instance-${index}`)
    .defaults({ 'agent.version': agentVersion, 'service.language.name': language });
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 2000);
  const clusterSize = getNumberOpt(scenarioOpts, 'clusterSize', 10);
  const throughput = getNumberOpt(scenarioOpts, 'throughput', 5);

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances: Instance[] = times(numServices).map(makeInstance);
      const numClusters = Math.ceil(numServices / clusterSize);

      const gatewayIndex = (c: number) => c * clusterSize;

      const generators = times(numClusters).flatMap((clusterIdx) => {
        const gwIdx = gatewayIndex(clusterIdx);
        if (gwIdx >= numServices) return [];
        const gateway = instances[gwIdx];

        const clusterBackends = times(clusterSize - 1)
          .map((b) => gwIdx + 1 + b)
          .filter((i) => i < numServices)
          .map((i) => instances[i]);

        const neighborGateways = [
          instances[gatewayIndex((clusterIdx + 1) % numClusters)],
          instances[gatewayIndex((clusterIdx + 3) % numClusters)],
        ].filter((inst) => inst !== gateway);

        return [
          range.ratePerMinute(throughput).generator((timestamp) => {
            const rootDuration = random(200, 2000);
            const generateError = random(1, 5) === 1;

            const backendSpans = clusterBackends.map((backend, i) => {
              const spanDuration = random(20, 300);
              const backendName = backend.fields['service.name'] as string;
              return gateway
                .span({
                  spanName: `call ${backendName}`,
                  spanType: 'external',
                  spanSubtype: 'http',
                })
                .timestamp(timestamp + i * 5)
                .duration(spanDuration)
                .destination(backendName)
                .children(
                  backend
                    .transaction({ transactionName: 'GET /internal' })
                    .timestamp(timestamp + i * 5 + 2)
                    .duration(spanDuration - 5)
                    .success()
                );
            });

            const neighborSpans = neighborGateways.map((neighbor, i) => {
              const spanDuration = random(50, 500);
              const neighborName = neighbor.fields['service.name'] as string;
              return gateway
                .span({
                  spanName: `call ${neighborName}`,
                  spanType: 'external',
                  spanSubtype: 'http',
                })
                .timestamp(timestamp + clusterBackends.length * 5 + i * 5)
                .duration(spanDuration)
                .destination(neighborName)
                .children(
                  neighbor
                    .transaction({ transactionName: 'GET /api/request' })
                    .timestamp(timestamp + clusterBackends.length * 5 + i * 5 + 2)
                    .duration(spanDuration - 5)
                    .success()
                );
            });

            const rootTx = gateway
              .transaction({ transactionName: 'GET /api/request' })
              .timestamp(timestamp)
              .duration(rootDuration)
              .children(...backendSpans, ...neighborSpans);

            return generateError
              ? rootTx.failure().errors(
                  gateway
                    .error({
                      message: 'Request failed',
                      type: 'Error',
                      culprit: 'GET /api/request',
                    })
                    .timestamp(timestamp + 5)
                )
              : rootTx.success();
          }),
        ];
      });

      return withClient(
        apmEsClient,
        logger.perf('generating_otel_distributed_events', () => generators)
      );
    },
  };
};

export default scenario;
