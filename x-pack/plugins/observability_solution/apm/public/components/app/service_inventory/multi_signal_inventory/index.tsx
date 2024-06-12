/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { APIReturnType } from '../../../../../../observability_ai_assistant/public';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import {
  MultiSignalServicesTable,
  ServiceInventoryFieldName,
} from './table/multi_signal_services_table';

type MainStatisticsApiResponse = APIReturnType<'GET /internal/apm/entities/services'>;

const INITIAL_PAGE_SIZE = 25;
const INITIAL_SORT_DIRECTION = 'desc';

const INITIAL_DATA: MainStatisticsApiResponse & { requestId: string } = {
  services: [],
};

function useServicesMainStatisticsFetcher() {
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
  const { mainStatisticsData, mainStatisticsStatus } = useServicesMainStatisticsFetcher();

  const tiebreakerField = ServiceInventoryFieldName.Throughput;

  const initialSortField = tiebreakerField;

  const noItemsMessage = <div>no service</div>;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <MultiSignalServicesTable
          status={mainStatisticsStatus}
          data={mainStatisticsData}
          initialSortField={initialSortField}
          initialPageSize={INITIAL_PAGE_SIZE}
          initialSortDirection={INITIAL_SORT_DIRECTION}
          noItemsMessage={noItemsMessage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
