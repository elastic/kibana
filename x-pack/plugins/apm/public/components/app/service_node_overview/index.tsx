/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
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
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { truncate, unit } from '../../../utils/style';
import { ServiceNodeMetricOverviewLink } from '../../shared/Links/apm/ServiceNodeMetricOverviewLink';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';

const INITIAL_PAGE_SIZE = 25;
const INITIAL_SORT_FIELD = 'cpu';
const INITIAL_SORT_DIRECTION = 'desc';

const ServiceNodeName = euiStyled.div`
  ${truncate(8 * unit)}
`;

function ServiceNodeOverview() {
  const {
    urlParams: { kuery, start, end },
  } = useUrlParams();

  const { serviceName } = useApmServiceContext();

  const { data } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/serviceNodes',
        params: {
          path: {
            serviceName,
          },
          query: {
            kuery,
            start,
            end,
          },
        },
      });
    },
    [kuery, serviceName, start, end]
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
          </>
        </EuiToolTip>
      ),
      field: 'name',
      sortable: true,
      render: (name: string) => {
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
      name: i18n.translate('xpack.apm.jvmsTable.cpuColumnLabel', {
        defaultMessage: 'CPU avg',
      }),
      field: 'cpu',
      sortable: true,
      render: (value: number | null) => asPercent(value, 1),
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
    <ManagedTable
      noItemsMessage={i18n.translate('xpack.apm.jvmsTable.noJvmsLabel', {
        defaultMessage: 'No JVMs were found',
      })}
      items={items}
      columns={columns}
      initialPageSize={INITIAL_PAGE_SIZE}
      initialSortField={INITIAL_SORT_FIELD}
      initialSortDirection={INITIAL_SORT_DIRECTION}
    />
  );
}

export { ServiceNodeOverview };
