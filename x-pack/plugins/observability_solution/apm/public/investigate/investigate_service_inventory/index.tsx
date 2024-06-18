/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Pagination } from '@elastic/eui';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { compact, uniq } from 'lodash';
import React, { useMemo, useRef, useState } from 'react';
import { isMobileAgentName } from '../../../common/agent_name';
import { ApmDocumentType } from '../../../common/document_type';
import type { Environment } from '../../../common/environment_rt';
import { ServiceHealthStatus } from '../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../common/service_inventory';
import { useTimeRangeMetadata } from '../../context/time_range_metadata/use_time_range_metadata_context';
import { useBreakpoints } from '../../hooks/use_breakpoints';
import { isFailure, isPending } from '../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSizeWithoutContext } from '../../hooks/use_preferred_data_source_and_bucket_size';
import { apmRouter } from '../../components/routing/apm_route_config';
import { ServiceLinkBase } from '../../components/shared/links/apm/service_link';
import { getServiceColumns } from '../../components/app/service_inventory/service_list/get_service_columns';
import { InteractiveServiceListItem } from '../../components/app/service_inventory/service_list/types';
import { UnmanagedServiceList } from '../../components/app/service_inventory/service_list/unmanaged_service_list';
import { useServicesMainStatisticsFetcherWithoutContext } from '../../components/app/service_inventory/use_services_main_statistics_fetcher';
import { orderServiceItems } from '../../components/app/service_inventory/service_list/order_service_items';
import { useKibana } from '../../context/kibana_context/use_kibana';

export function InvestigateServiceInventory({
  serviceGroup,
  environment,
  timeRange,
  query,
  onServiceClick,
}: {
  environment: Environment;
  serviceGroup: string;
  onServiceClick: (service: { serviceName: string }) => Promise<void>;
} & GlobalWidgetParameters) {
  const start = timeRange.from;
  const end = timeRange.to;

  const kuery = query.query;

  const breakpoints = useBreakpoints();

  const {
    services: { http },
  } = useKibana();

  const timeRangeMetadataFetch = useTimeRangeMetadata({
    start,
    end,
    kuery,
  });

  const preferred = usePreferredDataSourceAndBucketSizeWithoutContext({
    start,
    end,
    numBuckets: 20,
    timeRangeMetadataFetch,
    type: ApmDocumentType.ServiceTransactionMetric,
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [sortField, setSortField] = useState<keyof InteractiveServiceListItem>('throughput');

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const mainStatisticsFetch = useServicesMainStatisticsFetcherWithoutContext({
    start,
    end,
    kuery,
    environment,
    preferred,
    serviceGroup,
    tableOptions: {
      page,
      pageSize,
      sortDirection,
      sortField,
    },
  });

  const showAlertsColumn = mainStatisticsFetch.mainStatisticsData.items.some((item) =>
    Boolean(item.alertsCount)
  );

  const allHealthStatuses = compact(
    uniq(mainStatisticsFetch.mainStatisticsData.items.map((item) => item.healthStatus))
  );

  const isAllUnknown =
    allHealthStatuses.length === 0 ||
    (allHealthStatuses.length === 1 && allHealthStatuses[0] === ServiceHealthStatus.unknown);

  const showHealthStatusColumn = isAllUnknown === false;

  const columns = useMemo(() => {
    return getServiceColumns({
      breakpoints,
      comparisonDataLoading: false,
      showAlertsColumn,
      showHealthStatusColumn,
      showTransactionTypeColumn: false,
      comparisonData: undefined,
    });
  }, [breakpoints, showAlertsColumn, showHealthStatusColumn]);

  const onServiceClickRef = useRef(onServiceClick);
  onServiceClickRef.current = onServiceClick;

  const items = useMemo<InteractiveServiceListItem[]>(() => {
    return mainStatisticsFetch.mainStatisticsData.items.map((item): InteractiveServiceListItem => {
      const queryForLink = {
        rangeFrom: start,
        rangeTo: end,
        environment,
        comparisonEnabled: false,
        kuery,
        serviceGroup,
        transactionType: item.transactionType,
      };

      const href = isMobileAgentName(item.agentName)
        ? http.basePath.prepend(
            '/app/apm' +
              apmRouter.link('/services/{serviceName}', {
                path: {
                  serviceName: item.serviceName,
                },
                query: queryForLink,
              })
          )
        : http.basePath.prepend(
            '/app/apm' +
              apmRouter.link('/mobile-services/{serviceName}', {
                path: {
                  serviceName: item.serviceName,
                },
                query: queryForLink,
              })
          );

      return {
        ...item,
        serviceLink: (
          <ServiceLinkBase
            href={href}
            serviceName={item.serviceName}
            agentName={item.agentName}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onServiceClickRef.current({ serviceName: item.serviceName });
            }}
          />
        ),
        alerts: {
          href: apmRouter.link('/services/{serviceName}/alerts', {
            path: {
              serviceName: item.serviceName,
            },
            query: queryForLink,
          }),
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
          },
        },
      };
    });
  }, [
    mainStatisticsFetch.mainStatisticsData.items,
    start,
    end,
    environment,
    serviceGroup,
    kuery,
    http,
  ]);

  const sorting = useMemo(() => {
    return {
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    };
  }, [sortDirection, sortField]);

  const totalItemCount = mainStatisticsFetch.mainStatisticsData.items.length;

  const pagination = useMemo<Pagination>(() => {
    return {
      pageIndex: page,
      pageSize,
      totalItemCount,
      showPerPageOptions: false,
    };
  }, [page, pageSize, totalItemCount]);

  const sortedItems = useMemo(() => {
    return orderServiceItems({
      items,
      primarySortField: sortField,
      sortDirection,
      tiebreakerField: ServiceInventoryFieldName.Throughput,
    });
  }, [items, sortField, sortDirection]);

  return (
    <UnmanagedServiceList
      columns={columns}
      items={sortedItems}
      isLoading={isPending(mainStatisticsFetch.mainStatisticsStatus)}
      isError={isFailure(mainStatisticsFetch.mainStatisticsStatus)}
      sorting={sorting}
      pagination={pagination}
      onChange={(criteria) => {
        setPage(criteria.page.index);
        setSortField((prevField) => criteria.sort?.field || prevField);
        setSortDirection((prevDirection) => criteria.sort?.direction || prevDirection);
        setPageSize(criteria.page.size);
      }}
    />
  );
}
