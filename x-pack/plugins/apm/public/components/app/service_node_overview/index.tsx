/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  getServiceNodeName,
  SERVICE_NODE_NAME_MISSING,
} from '../../../../common/service_nodes';
import {
  asDynamicBytes,
  asInteger,
  asPercent,
} from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { truncate, unit } from '../../../utils/style';
import { ServiceNodeMetricOverviewLink } from '../../shared/links/apm/service_node_metric_overview_link';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';

const INITIAL_SORT_FIELD = 'cpu';
const INITIAL_SORT_DIRECTION = 'desc';

const ServiceNodeName = euiStyled.div`
  ${truncate(8 * unit)}
`;

function ServiceNodeOverview() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/nodes');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { serviceName } = useApmServiceContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/serviceNodes',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              environment,
              start,
              end,
            },
          },
        }
      );
    },
    [kuery, environment, serviceName, start, end]
  );

  const items = data?.serviceNodes ?? [];
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
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
            />
          </>
        </EuiToolTip>
      ),
      field: 'name',
      sortable: true,
      render: (_, { name }) => {
        const { displayedName, tooltip } =
          name === SERVICE_NODE_NAME_MISSING
            ? {
                displayedName: getServiceNodeName(name),
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
      name: i18n.translate('xpack.apm.jvmsTable.hostName', {
        defaultMessage: 'Host name',
      }),
      field: 'hostName',
      sortable: true,
      render: (_, { hostName }) => hostName ?? '',
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.cpuColumnLabel', {
        defaultMessage: 'CPU avg',
      }),
      field: 'cpu',
      dataType: 'number',
      sortable: true,
      render: (_, { cpu }) => asPercent(cpu, 1),
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.heapMemoryColumnLabel', {
        defaultMessage: 'Heap memory avg',
      }),
      field: 'heapMemory',
      dataType: 'number',
      sortable: true,
      render: asDynamicBytes,
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.nonHeapMemoryColumnLabel', {
        defaultMessage: 'Non-heap memory avg',
      }),
      field: 'nonHeapMemory',
      dataType: 'number',
      sortable: true,
      render: asDynamicBytes,
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.threadCountColumnLabel', {
        defaultMessage: 'Thread count max',
      }),
      field: 'threadCount',
      dataType: 'number',
      sortable: true,
      render: asInteger,
    },
  ];

  return (
    <ManagedTable
      isLoading={status === FETCH_STATUS.LOADING}
      noItemsMessage={i18n.translate('xpack.apm.jvmsTable.noJvmsLabel', {
        defaultMessage: 'No JVMs were found',
      })}
      items={items}
      columns={columns}
      initialSortField={INITIAL_SORT_FIELD}
      initialSortDirection={INITIAL_SORT_DIRECTION}
    />
  );
}

export { ServiceNodeOverview };
