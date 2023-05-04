/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import React, { ReactNode, useContext } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import {
  invalidLicenseMessage,
  SERVICE_MAP_TIMEOUT_ERROR,
} from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useTheme } from '../../../hooks/use_theme';
import { LicensePrompt } from '../../shared/license_prompt';
import { Controls } from './controls';
import { Cytoscape } from './cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './empty_banner';
import { EmptyPrompt } from './empty_prompt';
import { Popover } from './popover';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './use_ref_dimensions';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { useServiceName } from '../../../hooks/use_service_name';
import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DisabledPrompt } from './disabled_prompt';

function useMapElements() {
 //return useContext(MapContext);
 return [{data:{id:'my-service'}}]
};

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <SearchBar showUnifiedSearchBar={false} />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceAround"
        // Set the height to give it some top margin
        style={{ height: '60vh' }}
      >
        <EuiFlexItem
          grow={false}
          style={{ width: 600, textAlign: 'center' as const }}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LoadingSpinner() {
  return (
    <EuiLoadingSpinner
      size="xl"
      style={{ position: 'absolute', top: '50%', left: '50%' }}
    />
  );
}

export function ServiceMapHome() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo, serviceGroup },
  } = useApmParams('/service-map');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
      serviceGroupId={serviceGroup}
    />
  );
}

export function ServiceMapServiceDetail() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  return (
    <ServiceMap
      environment={environment}
      kuery={kuery}
      start={start}
      end={end}
    />
  );
}

export function ServiceMap({
  environment,
  kuery,
  start,
  end,
  serviceGroupId,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
}) {
  const theme = useTheme();
  const license = useLicenseContext();
  const serviceName = 'test service name';
  //  const serviceName = useServiceName();

  const { config } = useApmPluginContext();

  // const data = {
  //   elements: [
  //     {
  //       data: {
  //         id: 'opbeans-java',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-java',
  //         'agent.name': 'java',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-java',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 3079648.687272727,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-python',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-python',
  //         'agent.name': 'python',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-python',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 1151196.1282051287,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'postgresql',
  //         'span.destination.service.resource': 'postgresql',
  //         'span.type': 'db',
  //         id: '>postgresql',
  //         label: 'postgresql',
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-php',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-php',
  //         'agent.name': 'php',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-php',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 4003588.301775148,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'redis',
  //         'span.destination.service.resource': 'redis',
  //         'span.type': 'cache',
  //         id: '>redis',
  //         label: 'redis',
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-ruby',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-ruby',
  //         'agent.name': 'ruby',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-ruby',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 1153033.3592233008,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-node',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-node',
  //         'agent.name': 'nodejs',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-node',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 2407239.527918781,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-dotnet-frontend',
  //         'service.name': 'opbeans-dotnet-frontend',
  //         'agent.name': 'nodejs',
  //         'service.environment': 'production',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-dotnet-frontend',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 78507013.39999999,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-java-otel',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-java-otel',
  //         'agent.name': 'opentelemetry/java',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-java-otel',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 3083773.1754385964,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'http',
  //         'span.destination.service.resource':
  //           'release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         'span.type': 'external',
  //         id: '>release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         label: 'release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-go',
  //         'service.environment': 'testing',
  //         'service.name': 'opbeans-go',
  //         'agent.name': 'go',
  //       },
  //     },
  //     {
  //       data: {
  //         id: 'opbeans-frontend',
  //         'service.environment': 'production',
  //         'service.name': 'opbeans-frontend',
  //         'agent.name': 'nodejs',
  //         serviceAnomalyStats: {
  //           serviceName: 'opbeans-frontend',
  //           jobId: 'apm-production-1ddf-apm_tx_metrics',
  //           transactionType: 'request',
  //           actualValue: 8874690.67213115,
  //           anomalyScore: 0,
  //           healthStatus: 'healthy',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'postgresql',
  //         'span.destination.service.resource': "postgresql/'opbeans-php'",
  //         'span.type': 'db',
  //         id: ">postgresql/'opbeans-php'",
  //         label: "postgresql/'opbeans-php'",
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'postgresql',
  //         'span.destination.service.resource': 'postgresql/opbeans-java',
  //         'span.type': 'db',
  //         id: '>postgresql/opbeans-java',
  //         label: 'postgresql/opbeans-java',
  //       },
  //     },
  //     {
  //       data: {
  //         'span.subtype': 'postgresql',
  //         'span.destination.service.resource': 'postgresql/opbeans-node',
  //         'span.type': 'db',
  //         id: '>postgresql/opbeans-node',
  //         label: 'postgresql/opbeans-node',
  //       },
  //     },
  //     {
  //       data: {
  //         'service.name': 'opbeans-dotnet',
  //         'agent.name': 'dotnet',
  //         'service.environment': 'production',
  //         id: 'opbeans-dotnet',
  //       },
  //     },
  //     {
  //       data: {
  //         'service.name': 'heartbeat',
  //         'agent.name': 'go',
  //         'service.environment': 'production',
  //         id: 'heartbeat',
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-frontend to opbeans-dotnet-frontend',
  //         id: 'opbeans-frontend~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-java-otel',
  //         label: 'opbeans-frontend to opbeans-java-otel',
  //         id: 'opbeans-frontend~opbeans-java-otel',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-node',
  //         label: 'opbeans-frontend to opbeans-node',
  //         id: 'opbeans-frontend~opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-php',
  //         label: 'opbeans-frontend to opbeans-php',
  //         id: 'opbeans-frontend~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-python',
  //         label: 'opbeans-frontend to opbeans-python',
  //         id: 'opbeans-frontend~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-frontend',
  //         target: 'opbeans-ruby',
  //         label: 'opbeans-frontend to opbeans-ruby',
  //         id: 'opbeans-frontend~opbeans-ruby',
  //         sourceData: {
  //           id: 'opbeans-frontend',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-frontend',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 8874690.67213115,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-go',
  //         target: '>postgresql',
  //         label: 'opbeans-go to postgresql',
  //         id: 'opbeans-go~>postgresql',
  //         sourceData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql',
  //           'span.type': 'db',
  //           id: '>postgresql',
  //           label: 'postgresql',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-go',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-go to opbeans-dotnet-frontend',
  //         id: 'opbeans-go~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-go',
  //         target: 'opbeans-php',
  //         label: 'opbeans-go to opbeans-php',
  //         id: 'opbeans-go~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-go',
  //         target: 'opbeans-ruby',
  //         label: 'opbeans-go to opbeans-ruby',
  //         id: 'opbeans-go~opbeans-ruby',
  //         sourceData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //         targetData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: '>postgresql',
  //         label: 'opbeans-java-otel to postgresql',
  //         id: 'opbeans-java-otel~>postgresql',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql',
  //           'span.type': 'db',
  //           id: '>postgresql',
  //           label: 'postgresql',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-java-otel to opbeans-dotnet-frontend',
  //         id: 'opbeans-java-otel~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: 'opbeans-go',
  //         label: 'opbeans-java-otel to opbeans-go',
  //         id: 'opbeans-java-otel~opbeans-go',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: 'opbeans-java',
  //         label: 'opbeans-java-otel to opbeans-java',
  //         id: 'opbeans-java-otel~opbeans-java',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: 'opbeans-php',
  //         label: 'opbeans-java-otel to opbeans-php',
  //         id: 'opbeans-java-otel~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java-otel',
  //         target: 'opbeans-python',
  //         label: 'opbeans-java-otel to opbeans-python',
  //         id: 'opbeans-java-otel~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: '>postgresql/opbeans-java',
  //         label: 'opbeans-java to postgresql/opbeans-java',
  //         id: 'opbeans-java~>postgresql/opbeans-java',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql/opbeans-java',
  //           'span.type': 'db',
  //           id: '>postgresql/opbeans-java',
  //           label: 'postgresql/opbeans-java',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-java to opbeans-dotnet-frontend',
  //         id: 'opbeans-java~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: 'opbeans-node',
  //         label: 'opbeans-java to opbeans-node',
  //         id: 'opbeans-java~opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: 'opbeans-php',
  //         label: 'opbeans-java to opbeans-php',
  //         id: 'opbeans-java~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: 'opbeans-python',
  //         label: 'opbeans-java to opbeans-python',
  //         id: 'opbeans-java~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-java',
  //         target: 'opbeans-ruby',
  //         label: 'opbeans-java to opbeans-ruby',
  //         id: 'opbeans-java~opbeans-ruby',
  //         sourceData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: '>postgresql',
  //         label: 'opbeans-node to postgresql',
  //         id: 'opbeans-node~>postgresql',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql',
  //           'span.type': 'db',
  //           id: '>postgresql',
  //           label: 'postgresql',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: '>postgresql/opbeans-node',
  //         label: 'opbeans-node to postgresql/opbeans-node',
  //         id: 'opbeans-node~>postgresql/opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql/opbeans-node',
  //           'span.type': 'db',
  //           id: '>postgresql/opbeans-node',
  //           label: 'postgresql/opbeans-node',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: '>redis',
  //         label: 'opbeans-node to redis',
  //         id: 'opbeans-node~>redis',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'redis',
  //           'span.destination.service.resource': 'redis',
  //           'span.type': 'cache',
  //           id: '>redis',
  //           label: 'redis',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: '>release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         label:
  //           'opbeans-node to release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         id: 'opbeans-node~>release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'http',
  //           'span.destination.service.resource':
  //             'release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //           'span.type': 'external',
  //           id: '>release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //           label: 'release-oblt.apm.us-west2.gcp.elastic-cloud.com:443',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-node to opbeans-dotnet-frontend',
  //         id: 'opbeans-node~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: 'opbeans-go',
  //         label: 'opbeans-node to opbeans-go',
  //         id: 'opbeans-node~opbeans-go',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: 'opbeans-java',
  //         label: 'opbeans-node to opbeans-java',
  //         id: 'opbeans-node~opbeans-java',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-node',
  //         target: 'opbeans-python',
  //         label: 'opbeans-node to opbeans-python',
  //         id: 'opbeans-node~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: ">postgresql/'opbeans-php'",
  //         label: "opbeans-php to postgresql/'opbeans-php'",
  //         id: "opbeans-php~>postgresql/'opbeans-php'",
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': "postgresql/'opbeans-php'",
  //           'span.type': 'db',
  //           id: ">postgresql/'opbeans-php'",
  //           label: "postgresql/'opbeans-php'",
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-php to opbeans-dotnet-frontend',
  //         id: 'opbeans-php~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-go',
  //         label: 'opbeans-php to opbeans-go',
  //         id: 'opbeans-php~opbeans-go',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-java-otel',
  //         label: 'opbeans-php to opbeans-java-otel',
  //         id: 'opbeans-php~opbeans-java-otel',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-node',
  //         label: 'opbeans-php to opbeans-node',
  //         id: 'opbeans-php~opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-python',
  //         label: 'opbeans-php to opbeans-python',
  //         id: 'opbeans-php~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-php',
  //         target: 'opbeans-ruby',
  //         label: 'opbeans-php to opbeans-ruby',
  //         id: 'opbeans-php~opbeans-ruby',
  //         sourceData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: '>postgresql',
  //         label: 'opbeans-python to postgresql',
  //         id: 'opbeans-python~>postgresql',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql',
  //           'span.type': 'db',
  //           id: '>postgresql',
  //           label: 'postgresql',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: '>redis',
  //         label: 'opbeans-python to redis',
  //         id: 'opbeans-python~>redis',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'redis',
  //           'span.destination.service.resource': 'redis',
  //           'span.type': 'cache',
  //           id: '>redis',
  //           label: 'redis',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-python to opbeans-dotnet-frontend',
  //         id: 'opbeans-python~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-go',
  //         label: 'opbeans-python to opbeans-go',
  //         id: 'opbeans-python~opbeans-go',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-go',
  //           'service.environment': 'testing',
  //           'service.name': 'opbeans-go',
  //           'agent.name': 'go',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-java',
  //         label: 'opbeans-python to opbeans-java',
  //         id: 'opbeans-python~opbeans-java',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java',
  //           'agent.name': 'java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3079648.687272727,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-java-otel',
  //         label: 'opbeans-python to opbeans-java-otel',
  //         id: 'opbeans-python~opbeans-java-otel',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-java-otel',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-java-otel',
  //           'agent.name': 'opentelemetry/java',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-java-otel',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 3083773.1754385964,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-node',
  //         label: 'opbeans-python to opbeans-node',
  //         id: 'opbeans-python~opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-php',
  //         label: 'opbeans-python to opbeans-php',
  //         id: 'opbeans-python~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-python',
  //         target: 'opbeans-ruby',
  //         label: 'opbeans-python to opbeans-ruby',
  //         id: 'opbeans-python~opbeans-ruby',
  //         sourceData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         bidirectional: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-ruby',
  //         target: '>postgresql',
  //         label: 'opbeans-ruby to postgresql',
  //         id: 'opbeans-ruby~>postgresql',
  //         sourceData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           'span.subtype': 'postgresql',
  //           'span.destination.service.resource': 'postgresql',
  //           'span.type': 'db',
  //           id: '>postgresql',
  //           label: 'postgresql',
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-ruby',
  //         target: 'opbeans-dotnet-frontend',
  //         label: 'opbeans-ruby to opbeans-dotnet-frontend',
  //         id: 'opbeans-ruby~opbeans-dotnet-frontend',
  //         sourceData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-dotnet-frontend',
  //           'service.name': 'opbeans-dotnet-frontend',
  //           'agent.name': 'nodejs',
  //           'service.environment': 'production',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-dotnet-frontend',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 78507013.39999999,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-ruby',
  //         target: 'opbeans-node',
  //         label: 'opbeans-ruby to opbeans-node',
  //         id: 'opbeans-ruby~opbeans-node',
  //         sourceData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-node',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-node',
  //           'agent.name': 'nodejs',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-node',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 2407239.527918781,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-ruby',
  //         target: 'opbeans-php',
  //         label: 'opbeans-ruby to opbeans-php',
  //         id: 'opbeans-ruby~opbeans-php',
  //         sourceData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-php',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-php',
  //           'agent.name': 'php',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-php',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 4003588.301775148,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //     {
  //       data: {
  //         source: 'opbeans-ruby',
  //         target: 'opbeans-python',
  //         label: 'opbeans-ruby to opbeans-python',
  //         id: 'opbeans-ruby~opbeans-python',
  //         sourceData: {
  //           id: 'opbeans-ruby',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-ruby',
  //           'agent.name': 'ruby',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-ruby',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1153033.3592233008,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         targetData: {
  //           id: 'opbeans-python',
  //           'service.environment': 'production',
  //           'service.name': 'opbeans-python',
  //           'agent.name': 'python',
  //           serviceAnomalyStats: {
  //             serviceName: 'opbeans-python',
  //             jobId: 'apm-production-1ddf-apm_tx_metrics',
  //             transactionType: 'request',
  //             actualValue: 1151196.1282051287,
  //             anomalyScore: 0,
  //             healthStatus: 'healthy',
  //           },
  //         },
  //         isInverseEdge: true,
  //       },
  //     },
  //   ],
  // };
  const data = { elements: useMapElements() };
  const status = FETCH_STATUS.SUCCESS;
  const error = undefined;

  // const {
  //   data = { elements: [] },
  //   status,
  //   error,
  // } = useFetcher(
  //   (callApmApi) => {
  //     // When we don't have a license or a valid license, don't make the request.
  //     if (
  //       !license ||
  //       !isActivePlatinumLicense(license) ||
  //       !config.serviceMapEnabled
  //     ) {
  //       return;
  //     }

  //     return callApmApi('GET /internal/apm/service-map', {
  //       isCachable: false,
  //       params: {
  //         query: {
  //           start,
  //           end,
  //           environment,
  //           serviceName,
  //           serviceGroup: serviceGroupId,
  //           kuery,
  //         },
  //       },
  //     });
  //   },
  //   [
  //     license,
  //     serviceName,
  //     environment,
  //     start,
  //     end,
  //     serviceGroupId,
  //     kuery,
  //     config.serviceMapEnabled,
  //   ]
  // );

  const { ref, height } = useRefDimensions();

  // Temporary hack to work around bottom padding introduced by EuiPage
  const PADDING_BOTTOM = 24;
 // const heightWithPadding = height - PADDING_BOTTOM;
const heightWithPadding = 300;
  if (!license) {
    return null;
  }

  if (!isActivePlatinumLicense(license)) {
    return (
      <PromptContainer>
        <LicensePrompt text={invalidLicenseMessage} />
      </PromptContainer>
    );
  }

  if (!config.serviceMapEnabled) {
    return (
      <PromptContainer>
        <DisabledPrompt />
      </PromptContainer>
    );
  }

  if (status === FETCH_STATUS.SUCCESS && data.elements.length === 0) {
    return (
      <PromptContainer>
        <EmptyPrompt />
      </PromptContainer>
    );
  }

  if (
    status === FETCH_STATUS.FAILURE &&
    error &&
    'body' in error &&
    error.body?.statusCode === 500 &&
    error.body?.message === SERVICE_MAP_TIMEOUT_ERROR
  ) {
    return (
      <PromptContainer>
        <TimeoutPrompt isGlobalServiceMap={!serviceName} />
      </PromptContainer>
    );
  }

  return (
    <EuiPanel
      hasBorder={true}
      paddingSize="none"
      style={{
        position: 'absolute',
        top: 50,
        right: 0,
        width: 300,
        height: heightWithPadding,
      }}
    >
      <div
        data-test-subj="ServiceMap"
        style={{ height: heightWithPadding }}
        ref={ref}
      >
        <Cytoscape
          elements={data.elements}
          height={heightWithPadding}
          serviceName={serviceName}
          style={getCytoscapeDivStyle(theme, status)}
        >
          <Controls />
          {serviceName && <EmptyBanner />}
          {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
          <Popover
            focusedServiceName={serviceName}
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
          />
        </Cytoscape>
      </div>
    </EuiPanel>
  );
}
