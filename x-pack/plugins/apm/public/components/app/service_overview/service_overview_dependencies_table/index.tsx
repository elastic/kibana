/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useContext } from 'react';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { getNodeName, NodeType } from '../../../../../common/connections';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { DependencyLink } from '../../../shared/links/dependency_link';
import { DependenciesTable } from '../../../shared/dependencies_table';
import { ServiceLink } from '../../../shared/links/apm/service_link';
import { CytoscapeContext } from '../../../../context/cytoscape_context';

interface ServiceOverviewDependenciesTableProps {
  fixedHeight?: boolean;
  link?: ReactNode;
  showPerPageOptions?: boolean;
}

export function ServiceOverviewDependenciesTable({
  fixedHeight,
  link,
  showPerPageOptions = true,
}: ServiceOverviewDependenciesTableProps) {
  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      serviceGroup,
      comparisonEnabled,
      offset,
      latencyAggregationType,
    },
  } = useApmParams('/services/{serviceName}/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { serviceName, transactionType } = useApmServiceContext();

  const trackEvent = useUiTracker();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/dependencies',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
              numBuckets: 20,
              offset:
                comparisonEnabled && isTimeComparison(offset)
                  ? offset
                  : undefined,
            },
          },
        }
      );
    },
    [start, end, serviceName, environment, offset, comparisonEnabled]
  );

  const dependencyEdges = data?.serviceDependencies.map((dep) => {
    if (dep.location.serviceName) {
      return {
        data: {
          id: `${serviceName}~>${dep.location.serviceName}`,
          label: `${serviceName} to ${dep.location.serviceName}`,
          source: serviceName,
          target: dep.location.serviceName,
        },
      };
    } else if (dep.location.dependencyName) {
      return {
        data: {
          id: `${serviceName}~>${dep.location.dependencyName}`,
          label: `${serviceName} to ${dep.location.dependencyName}`,
          source: serviceName,
          target: `>${dep.location.dependencyName}`,
        },
      };
    }
  });

  const dependencyNodes = data?.serviceDependencies.map((dep) => {
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
  const cy = useContext(CytoscapeContext);
  if (Array.isArray(dependencyNodes)) {
    cy.add(dependencyNodes);
  }
  if (Array.isArray(dependencyEdges)) {
    cy.add(dependencyEdges);
  }
  window.cy = cy;

  const dependencies =
    data?.serviceDependencies.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);
      const itemLink =
        location.type === NodeType.dependency ? (
          <DependencyLink
            type={location.spanType}
            subtype={location.spanSubtype}
            query={{
              dependencyName: location.dependencyName,
              comparisonEnabled,
              offset,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
            }}
            onClick={() => {
              trackEvent({
                app: 'apm',
                metricType: METRIC_TYPE.CLICK,
                metric: 'service_dependencies_to_dependency_detail',
              });
            }}
          />
        ) : (
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
              latencyAggregationType,
              transactionType,
              serviceGroup,
            }}
          />
        );

      return {
        name,
        currentStats: dependency.currentStats,
        previousStats: dependency.previousStats,
        link: itemLink,
      };
    }) ?? [];

  return (
    <DependenciesTable
      dependencies={dependencies}
      fixedHeight={fixedHeight}
      title={
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.serviceOverview.dependenciesTableTitleTip',
            {
              defaultMessage:
                'Downstream services and external connections to uninstrumented services',
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.serviceOverview.dependenciesTableTitle',
              {
                defaultMessage: 'Dependencies',
              }
            )}
            &nbsp;
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignCenter"
            />
          </>
        </EuiToolTip>
      }
      nameColumnTitle={i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumn',
        {
          defaultMessage: 'Dependency',
        }
      )}
      status={status}
      link={link}
      showPerPageOptions={showPerPageOptions}
      initialPageSize={5}
    />
  );
}
