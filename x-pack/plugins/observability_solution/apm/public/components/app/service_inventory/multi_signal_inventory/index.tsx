/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
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

export const MultiSignalInventory = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { mainStatisticsData, mainStatisticsStatus } = useServicesEntitiesMainStatisticsFetcher();

  const initialSortField = ServiceInventoryFieldName.Throughput;

  const filteredData = getItemsFilteredBySearchQuery({
    items: mainStatisticsData.services,
    searchQuery,
    fieldsToSearch: [ServiceInventoryFieldName.ServiceName],
  });

  return (
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
  );
};
