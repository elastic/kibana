/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { GetDataStreamsStatsQuery } from '../../common/data_streams_stats';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityFlyout = ({ datasetQuery }: GetDataStreamsStatsQuery) => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();
  const { dataStreamsStatsServiceClient: client } = useDatasetQualityContext();
  const { data = [], loading } = useFetcher(
    async () => client.getDataStreamsStats({ datasetQuery }),
    []
  );

  return { dataStreamStat: data[0], loading, fieldFormats };
};
