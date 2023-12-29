/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DEFAULT_DATASET_TYPE } from '../../common/constants';
import { GetDataStreamDetailsParams } from '../../common/data_streams_stats';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityFlyout = ({ datasetQuery }: GetDataStreamDetailsParams) => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();
  const { dataStreamsStatsServiceClient: client } = useDatasetQualityContext();
  const { data: dataStreamStatList = [], loading: dataStreamStatLoading } = useFetcher(
    async () => client.getDataStreamsStats({ datasetQuery, type: DEFAULT_DATASET_TYPE }),
    [datasetQuery]
  );

  const { data: dataStreamDetails = {}, loading: dataStreamDetailsLoading } = useFetcher(
    async () => client.getDataStreamDetails({ datasetQuery, type: DEFAULT_DATASET_TYPE }),
    [datasetQuery]
  );

  return useMemo(
    () => ({
      dataStreamStat: dataStreamStatList[0],
      dataStreamDetails,
      loading: dataStreamStatLoading || dataStreamDetailsLoading,
      fieldFormats,
    }),
    [
      dataStreamStatList,
      dataStreamStatLoading,
      dataStreamDetails,
      dataStreamDetailsLoading,
      fieldFormats,
    ]
  );
};
