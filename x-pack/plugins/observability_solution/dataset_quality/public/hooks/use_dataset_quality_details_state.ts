/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSelector } from '@xstate/react';
import { OnRefreshProps } from '@elastic/eui';
import { DEFAULT_DATEPICKER_REFRESH } from '../../common/constants';
import { useDatasetQualityDetailsContext } from '../components/dataset_quality_details/context';
import { indexNameToDataStreamParts } from '../../common/utils';

export const useDatasetQualityDetailsState = () => {
  const { service } = useDatasetQualityDetailsContext();

  const { dataStream, degradedFields, timeRange, breakdownField } =
    useSelector(service, (state) => state.context) ?? {};

  const isNonAggregatable = useSelector(service, (state) =>
    state.matches('initializing.nonAggregatableDataset.done')
      ? state.context.isNonAggregatable
      : false
  );

  const isBreakdownFieldEcs = useSelector(service, (state) =>
    state.matches('initializing.checkBreakdownFieldIsEcs.done')
      ? state.context.isBreakdownFieldEcs
      : false
  );

  const { type, dataset, namespace } = indexNameToDataStreamParts(dataStream);

  const datasetDetails = {
    type,
    dataset,
    namespace,
    rawName: dataStream,
  };

  const loadingState = useSelector(service, (state) => ({
    nonAggregatableDatasetLoading: state.matches('initializing.nonAggregatableDataset.fetching'),
  }));

  const updateTimeRange = useCallback(
    ({ start, end, refreshInterval }: OnRefreshProps) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          from: start,
          to: end,
          refresh: { ...DEFAULT_DATEPICKER_REFRESH, value: refreshInterval },
        },
      });
    },
    [service]
  );

  return {
    service,
    dataStream,
    datasetDetails,
    degradedFields,
    breakdownField,
    isBreakdownFieldEcs,
    isNonAggregatable,
    timeRange,
    loadingState,
    updateTimeRange,
  };
};
