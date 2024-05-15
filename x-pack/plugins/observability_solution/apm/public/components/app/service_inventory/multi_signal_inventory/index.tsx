/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { APIReturnType } from '../../../../../../observability_ai_assistant/public';
import { ApmDocumentType } from '../../../../../common/document_type';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ServiceInventoryFieldName } from './table/get_service_columns';
import { MultiSignalServicesTable } from './table/multi_signal_services_table';

type MainStatisticsApiResponse = APIReturnType<'GET /internal/apm/assets/services'>;

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

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const shouldUseDurationSummary = !!preferred?.source?.hasDurationSummaryField;

  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (preferred) {
        return callApmApi('GET /internal/apm/assets/services', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              useDurationSummary: shouldUseDurationSummary,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
            },
          },
        }).then((mainStatisticsData) => {
          return {
            requestId: uuidv4(),
            ...mainStatisticsData,
          };
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [environment, kuery, start, end, preferred, page, pageSize, sortField, sortDirection]
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
