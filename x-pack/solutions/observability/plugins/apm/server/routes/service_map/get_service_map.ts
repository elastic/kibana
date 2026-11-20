/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoolQuery } from '@kbn/es-query';
import type { ServiceMapGrouping } from '@kbn/apm-types';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { type ServiceMapResponse } from '../../../common/service_map';
import type { SavedServiceGroup } from '../../../common/service_groups';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import type { EnhancedServiceStatsOptions } from './get_enhanced_service_stats';
import { getEnhancedServiceStats } from './get_enhanced_service_stats';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';
import type { ServiceCallGraph } from './get_service_call_graph';
import { getServiceCallGraph } from './get_service_call_graph';
import type { ServiceGroupingAttributes } from './get_service_grouping_attributes';
import { getServiceGroupingAttributes } from './get_service_grouping_attributes';
import { buildServiceGrouping } from './grouping/build_service_grouping';
import { SERVICE_GROUPING_MIN_SERVICES } from './grouping/constants';
import { getMapServices } from './grouping/get_map_services';

export interface IEnvOptions {
  mlClient?: MlClient;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName?: string;
  environment: string;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroupKuery?: string;
  /** Saved groups to match for grouping. Omitted or empty when already on a group map. */
  savedServiceGroups?: SavedServiceGroup[];
  kuery?: string;
  /** Pre-built ES query from the client (query + filter bar + Controls API). */
  esQuery?: { bool: BoolQuery };
}

async function getConnectionData({
  config,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  serviceGroupKuery,
  kuery,
  esQuery,
  logger,
}: IEnvOptions): Promise<{ tracesCount: number; spans: ServiceMapSpan[] }> {
  return withApmSpan('get_service_map_connections', async () => {
    logger.debug('Getting trace sample IDs');
    const { traceIds } = await getTraceSampleIds({
      config,
      apmEventClient,
      serviceName,
      environment,
      start,
      end,
      serviceGroupKuery,
      kuery,
      esQuery,
    });

    logger.debug(`Found ${traceIds.length} traces to inspect`);

    if (traceIds.length === 0) {
      return { spans: [], tracesCount: 0 };
    }

    const spans = await withApmSpan('get_service_map_exit_spans_and_transactions_from_traces', () =>
      fetchExitSpanSamplesFromTraceIds({
        apmEventClient,
        traceIds,
        start,
        end,
      })
    );

    return {
      tracesCount: traceIds.length,
      spans,
    };
  });
}

/** Service map grouping features, only available when service map grouping is enabled */
export type ServiceMapGroupingOptions =
  | { enabled: false }
  | ({ enabled: true } & Pick<EnhancedServiceStatsOptions, 'source'>);

export function getServiceMap(
  options: IEnvOptions & {
    maxNumberOfServices: number;
    grouping: ServiceMapGroupingOptions;
  }
): Promise<ServiceMapResponse> {
  return withApmSpan('get_service_map', async () => {
    const { logger, grouping } = options;
    const anomaliesPromise = getServiceAnomalies(
      options

      // always catch error to avoid breaking service maps if there is a problem with ML
    ).catch((error) => {
      logger.debug(`Unable to retrieve anomalies for service maps.`, { error });
      return DEFAULT_ANOMALIES;
    });

    const shouldApplyGrouping = grouping.enabled && !options.serviceName;

    const connectionDataPromise = getConnectionData(options);

    const servicesDataPromise = grouping.enabled
      ? getEnhancedServiceStats({ ...options, source: grouping.source })
      : getServiceStats(options);

    // A service page map stays ungrouped. A failed query leaves this map unchanged.
    let callGraphPromise: Promise<ServiceCallGraph | undefined> = Promise.resolve(undefined);
    if (shouldApplyGrouping) {
      callGraphPromise = getServiceCallGraph(options).catch((error) => {
        logger.debug(`Unable to retrieve the call graph for service maps.`, { error });
        return undefined;
      });
    }

    // The services the map draws, which every grouping and its labels are built over. Missing when
    // there are too few to group, so neither the labels nor the grouping are computed.
    let mapServicesPromise: Promise<string[] | undefined> = Promise.resolve(undefined);
    // The labels of the drawn services, to group them by attribute.
    let groupingAttributesPromise: Promise<ServiceGroupingAttributes | undefined> =
      Promise.resolve(undefined);
    if (shouldApplyGrouping) {
      mapServicesPromise = Promise.all([connectionDataPromise, servicesDataPromise]).then(
        ([{ spans }, servicesData]) => {
          const services = getMapServices({ spans, servicesData });
          return services.length >= SERVICE_GROUPING_MIN_SERVICES ? services : undefined;
        }
      );
      // Labels are read only for the drawn services, so they wait for them but do not need to wait for the call graph.
      groupingAttributesPromise = mapServicesPromise.then((services) => {
        if (services) {
          return getServiceGroupingAttributes({
            ...options,
            services,
            source: grouping.source,
          }).catch((error) => {
            logger.debug(`Unable to retrieve grouping attributes for service maps.`, { error });
            return undefined;
          });
        }
        return undefined;
      });
    }

    const [connectionData, servicesData, anomalies, callGraph, services, groupingAttributes] =
      await Promise.all([
        connectionDataPromise,
        servicesDataPromise,
        anomaliesPromise,
        callGraphPromise,
        mapServicesPromise,
        groupingAttributesPromise,
      ]);

    // If the grouping logic fails, the service map will remain ungrouped.
    // Grouping is pure code over data already read, so a failure here is an unexpected bug
    // so we log it at warning level as debug is off by default.
    let serviceGrouping: ServiceMapGrouping | undefined;
    if (callGraph && services) {
      try {
        serviceGrouping = {
          services,
          ...buildServiceGrouping({
            callGraph,
            spans: connectionData.spans,
            services,
            attributes: groupingAttributes,
          }),
        };
      } catch (error) {
        logger.warn(`Unable to group the services of the service map.`, { error });
      }
    }

    logger.debug('Received and parsed all responses');

    return {
      spans: connectionData.spans,
      tracesCount: connectionData.tracesCount,
      servicesData,
      anomalies,
      ...(serviceGrouping ? { serviceGrouping } : {}),
    };
  });
}
