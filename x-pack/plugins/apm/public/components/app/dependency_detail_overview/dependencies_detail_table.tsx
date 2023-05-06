/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect } from 'react';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { getNodeName, NodeType } from '../../../../common/connections';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { DependenciesTable } from '../../shared/dependencies_table';
import { ServiceLink } from '../../shared/links/apm/service_link';
import { useTimeRange } from '../../../hooks/use_time_range';
import { getComparisonEnabled } from '../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { CytoscapeContext } from '../../../context/cytoscape_context';

export function DependenciesDetailTable() {
  const {
    query: {
      dependencyName,
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      comparisonEnabled: urlComparisonEnabled,
      offset,
    },
  } = useApmParams('/dependencies/overview');

  const { core } = useApmPluginContext();

  const comparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/dependencies/upstream_services', {
        params: {
          query: {
            dependencyName,
            start,
            end,
            environment,
            numBuckets: 20,
            offset:
              comparisonEnabled && isTimeComparison(offset)
                ? offset
                : undefined,
            kuery,
          },
        },
      });
    },
    [start, end, environment, offset, dependencyName, kuery, comparisonEnabled]
  );

  const dependencyNodes = data?.services.map((dep) => {
    if (dep.location.serviceName) {
      return {
        data: {
          id: dep.location.serviceName,
          'agent.name': dep.location.agentName,
          'service.name': dep.location.serviceName,
        },
      };
    } else if (dep.location.dependencyName) {
      return {
        data: {
          id: `>${dep.location.dependencyName}`,
          label: dep.location.dependencyName,
          'span.destination.service.resource': dep.location.dependencyName,
          'span.subtype': dep.location.spanSubType,
          'span.type': dep.location.spanType,
        },
      };
    }
  });

  const dependencyEdges = data?.services.map((dep) => {
    if (dep.location.serviceName) {
      return {
        data: {
          id: `${dep.location.serviceName}~>>${dependencyName}}`,
          label: `${dep.location.serviceName} to ${dependencyName}`,
          source: dep.location.serviceName,
          target: `>${dependencyName}`,
        },
      };
    } else if (dep.location.dependencyName) {
      return {
        data: {
          id: `>${dep.location.dependencyName}~>>${dependencyName}`,
          label: `${dep.location.dependencyName} to ${dependencyName}`,
          source: `>${dep.location.dependencyName}`,
          target: `>${ddependencyName}`,
        },
      };
    }
  });
  const cy = useContext(CytoscapeContext);
  useEffect(() => {
    const thisDepOnMap = cy.$(`>#{dependencyName}`)[0];
    const thisDepForMap = {
      data: {
        id: `>${dependencyName}`,
        'span.destination.services.resource': dependencyName,
        label: dependencyName,
        // TODO: subtype/type
      },
    };

    const addedElements = cy.add([
      ...(!thisDepOnMap ? [thisDepForMap] : []),
      ...(dependencyNodes ?? []),
      ...(dependencyEdges ?? []),
    ]);
    cy.trigger('custom:data', [addedElements]);
  }, [dependencyName, dependencyNodes, dependencyEdges]);

  const dependencies =
    data?.services.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);

      if (location.type !== NodeType.service) {
        throw new Error('Expected a service node');
      }

      return {
        name,
        currentStats: dependency.currentStats,
        previousStats: dependency.previousStats,
        link: (
          <ServiceLink
            serviceName={location.serviceName}
            agentName={location.agentName}
            query={{
              comparisonEnabled,
              offset,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
              latencyAggregationType: undefined,
              transactionType: undefined,
              serviceGroup: '',
            }}
          />
        ),
      };
    }) ?? [];

  return (
    <DependenciesTable
      dependencies={dependencies}
      title={i18n.translate(
        'xpack.apm.dependencyDetail.dependenciesTableTitle',
        { defaultMessage: 'Upstream services' }
      )}
      nameColumnTitle={i18n.translate(
        'xpack.apm.dependencyDetail.dependenciesTableColumn',
        { defaultMessage: 'Service' }
      )}
      status={status}
      compact={false}
      initialPageSize={25}
    />
  );
}
