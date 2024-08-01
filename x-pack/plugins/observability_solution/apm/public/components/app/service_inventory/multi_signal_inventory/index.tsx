/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApmDocumentType } from '../../../../../common/document_type';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { EmptyMessage } from '../../../shared/empty_message';
import { SearchBar } from '../../../shared/search_bar/search_bar';
import {
  getItemsFilteredBySearchQuery,
  TableSearchBar,
} from '../../../shared/table_search_bar/table_search_bar';
import {
  MultiSignalServicesTable,
  ServiceInventoryFieldName,
} from './table/multi_signal_services_table';
import { ServiceListItem } from '../../../../../common/service_inventory';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { NoEntitiesEmptyState } from './table/no_entities_empty_state';
import { Welcome } from '../../../shared/entity_enablement/welcome_modal';
import { useKibana } from '../../../../context/kibana_context/use_kibana';
import { ApmPluginStartDeps, ApmServices } from '../../../../plugin';
import { useEntityManagerEnablementContext } from '../../../../context/entity_manager_context/use_entity_manager_enablement_context';

type MainStatisticsApiResponse = APIReturnType<'GET /internal/apm/entities/services'>;

const INITIAL_PAGE_SIZE = 25;
const INITIAL_SORT_DIRECTION = 'desc';

const INITIAL_DATA: MainStatisticsApiResponse & { requestId: string } = {
  services: [],
  requestId: '',
};

function useServicesEntitiesMainStatisticsFetcher() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      page = 0,
      pageSize = INITIAL_PAGE_SIZE,
      sortDirection,
      sortField,
    },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/entities/services', {
        params: {
          query: {
            environment,
            kuery,
            start,
            end,
          },
        },
      }).then((mainStatisticsData) => {
        return {
          requestId: uuidv4(),
          ...mainStatisticsData,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [environment, kuery, start, end, page, pageSize, sortField, sortDirection]
  );

  return { mainStatisticsData: data, mainStatisticsStatus: status };
}

function useServicesEntitiesDetailedStatisticsFetcher({
  mainStatisticsFetch,
  services,
}: {
  mainStatisticsFetch: ReturnType<typeof useServicesEntitiesMainStatisticsFetcher>;
  services: ServiceListItem[];
}) {
  const {
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const dataSourceOptions = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const { mainStatisticsData, mainStatisticsStatus } = mainStatisticsFetch;

  const timeseriesDataFetch = useProgressiveFetcher(
    (callApmApi) => {
      const serviceNames = services.map(({ serviceName }) => serviceName);

      if (
        start &&
        end &&
        serviceNames.length > 0 &&
        mainStatisticsStatus === FETCH_STATUS.SUCCESS &&
        dataSourceOptions
      ) {
        return callApmApi('POST /internal/apm/entities/services/detailed_statistics', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              documentType: dataSourceOptions.source.documentType,
              rollupInterval: dataSourceOptions.source.rollupInterval,
              bucketSizeInSeconds: dataSourceOptions.bucketSizeInSeconds,
            },
            body: {
              // Service name is sorted to guarantee the same order every time this API is called so the result can be cached.
              serviceNames: JSON.stringify(serviceNames.sort()),
            },
          },
        });
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call or offset is changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainStatisticsData.requestId, services],
    { preservePreviousData: false }
  );

  return { timeseriesDataFetch };
}

export function MultiSignalInventory() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { mainStatisticsData, mainStatisticsStatus } = useServicesEntitiesMainStatisticsFetcher();
  const mainStatisticsFetch = useServicesEntitiesMainStatisticsFetcher();
  const { tourState, updateTourState } = useEntityManagerEnablementContext();

  const initialSortField = ServiceInventoryFieldName.Throughput;

  const filteredData = getItemsFilteredBySearchQuery({
    items: mainStatisticsData.services,
    searchQuery,
    fieldsToSearch: [ServiceInventoryFieldName.ServiceName],
  });

  const { timeseriesDataFetch } = useServicesEntitiesDetailedStatisticsFetcher({
    mainStatisticsFetch,
    services: mainStatisticsData.services,
  });

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/has_entities');
  }, []);

  useEffect(() => {
    if (data?.hasData) {
      services.telemetry.reportEntityInventoryPageState({ state: 'available' });
    }
  }, [services.telemetry, data?.hasData]);

  function handleModalClose() {
    updateTourState({ isModalVisible: false, isTourActive: true });
  }

  return (
    <>
      {!data?.hasData && status === FETCH_STATUS.SUCCESS ? (
        <NoEntitiesEmptyState />
      ) : (
        <>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow>
              <TableSearchBar
                placeholder={i18n.translate('xpack.apm.servicesTable.filterServicesPlaceholder', {
                  defaultMessage: 'Search services by name',
                })}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SearchBar showQueryInput={false} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <MultiSignalServicesTable
                status={mainStatisticsStatus}
                data={filteredData}
                initialSortField={initialSortField}
                initialPageSize={INITIAL_PAGE_SIZE}
                initialSortDirection={INITIAL_SORT_DIRECTION}
                timeseriesData={timeseriesDataFetch?.data}
                timeseriesDataLoading={timeseriesDataFetch.status === FETCH_STATUS.LOADING}
                noItemsMessage={
                  <EmptyMessage
                    heading={i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
                      defaultMessage: 'No services found',
                    })}
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <Welcome
        isModalVisible={tourState.isModalVisible ?? false}
        onClose={handleModalClose}
        onConfirm={handleModalClose}
      />
    </>
  );
}
