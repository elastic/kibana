/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataStreamStatServiceResponse } from '../../common/data_streams_stats';
import { DataStreamNameParts, dataStreamPartsToIndexName } from '../../common/utils';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityFlyout = ({ type, dataset, namespace }: DataStreamNameParts) => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();
  const { dataStreamsStatsServiceClient: client } = useDatasetQualityContext();
  const { data: dataStreamStatList = [], loading: dataStreamStatLoading } = useFetcher(
    async () => client.getDataStreamsStats({ datasetQuery: `${dataset}-${namespace}`, type }),
    [dataset, namespace, type]
  );

  const { data: dataStreamDetails = {}, loading: dataStreamDetailsLoading } = useFetcher(
    async () =>
      client.getDataStreamDetails({
        dataStream: dataStreamPartsToIndexName({ type, dataset, namespace }),
      }),
    [dataset, namespace, type]
  );

  return useMemo(() => {
    const isDataStreamStatStale = isStaleData({ type, dataset, namespace }, dataStreamStatList[0]);

    return {
      dataStreamStat: isDataStreamStatStale ? undefined : dataStreamStatList[0],
      dataStreamDetails: isDataStreamStatStale ? undefined : dataStreamDetails,
      dataStreamStatLoading,
      dataStreamDetailsLoading,
      fieldFormats,
    };
  }, [
    type,
    dataset,
    namespace,
    dataStreamStatList,
    dataStreamStatLoading,
    dataStreamDetails,
    dataStreamDetailsLoading,
    fieldFormats,
  ]);
};

function isStaleData(args: DataStreamNameParts, dataStreamStat?: DataStreamStatServiceResponse[0]) {
  return (
    dataStreamStat &&
    dataStreamPartsToIndexName({
      type: dataStreamStat.type,
      dataset: dataStreamStat.name,
      namespace: dataStreamStat.namespace,
    }) !== dataStreamPartsToIndexName(args)
  );
}
