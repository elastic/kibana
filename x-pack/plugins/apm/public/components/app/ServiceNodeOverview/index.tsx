/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../common/i18n';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ManagedTable, ITableColumn } from '../../shared/ManagedTable';
import { useFetcher } from '../../../hooks/useFetcher';
import {
  asDynamicBytes,
  asInteger,
  asPercent,
} from '../../../utils/formatters';
import { ServiceNodeMetricOverviewLink } from '../../shared/Links/apm/ServiceNodeMetricOverviewLink';
import { truncate, px, unit } from '../../../style/variables';

const INITIAL_PAGE_SIZE = 25;
const INITIAL_SORT_FIELD = 'cpu';
const INITIAL_SORT_DIRECTION = 'desc';

const ServiceNodeName = styled.div`
  ${truncate(px(8 * unit))}
`;

const ServiceNodeOverview = () => {
  const { uiFilters, urlParams } = useUrlParams();
  const { serviceName, start, end } = urlParams;

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
    () => ({
      filterNames: ['host', 'containerId', 'podName'],
      params: {
        serviceName,
      },
      projection: PROJECTION.SERVICE_NODES,
    }),
    [serviceName]
  );

  const { data: items = [] } = useFetcher(
    (callApmApi) => {
      if (!serviceName || !start || !end) {
        return undefined;
      }
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/serviceNodes',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
          },
        },
      });
    },
    [serviceName, start, end, uiFilters]
  );

  if (!serviceName) {
    return null;
  }

  const columns: Array<ITableColumn<typeof items[0]>> = [
    {
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.apm.jvmsTable.nameExplanation', {
            defaultMessage: `By default, the JVM name is the container ID (where applicable) or the hostname, but it can be manually configured through the agent's 'service_node_name' configuration.`,
          })}
        >
          <>
            {i18n.translate('xpack.apm.jvmsTable.nameColumnLabel', {
              defaultMessage: 'Name',
            })}
          </>
        </EuiToolTip>
      ),
      field: 'name',
      sortable: true,
      render: (name: string) => {
        const { displayedName, tooltip } =
          name === SERVICE_NODE_NAME_MISSING
            ? {
                displayedName: UNIDENTIFIED_SERVICE_NODES_LABEL,
                tooltip: i18n.translate(
                  'xpack.apm.jvmsTable.explainServiceNodeNameMissing',
                  {
                    defaultMessage:
                      'We could not identify which JVMs these metrics belong to. This is likely caused by running a version of APM Server that is older than 7.5. Upgrading to APM Server 7.5 or higher should resolve this issue.',
                  }
                ),
              }
            : { displayedName: name, tooltip: name };

        return (
          <EuiToolTip content={tooltip}>
            <ServiceNodeMetricOverviewLink
              serviceName={serviceName}
              serviceNodeName={name}
            >
              <ServiceNodeName>{displayedName}</ServiceNodeName>
            </ServiceNodeMetricOverviewLink>
          </EuiToolTip>
        );
      },
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.cpuColumnLabel', {
        defaultMessage: 'CPU avg',
      }),
      field: 'cpu',
      sortable: true,
      render: (value: number | null) => asPercent(value || 0, 1),
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.heapMemoryColumnLabel', {
        defaultMessage: 'Heap memory avg',
      }),
      field: 'heapMemory',
      sortable: true,
      render: asDynamicBytes,
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.nonHeapMemoryColumnLabel', {
        defaultMessage: 'Non-heap memory avg',
      }),
      field: 'nonHeapMemory',
      sortable: true,
      render: asDynamicBytes,
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.threadCountColumnLabel', {
        defaultMessage: 'Thread count max',
      }),
      field: 'threadCount',
      sortable: true,
      render: asInteger,
    },
  ];

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiPanel>
            <ManagedTable
              noItemsMessage={i18n.translate(
                'xpack.apm.jvmsTable.noJvmsLabel',
                {
                  defaultMessage: 'No JVMs were found',
                }
              )}
              items={items}
              columns={columns}
              initialPageSize={INITIAL_PAGE_SIZE}
              initialSortField={INITIAL_SORT_FIELD}
              initialSortDirection={INITIAL_SORT_DIRECTION}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export { ServiceNodeOverview };
