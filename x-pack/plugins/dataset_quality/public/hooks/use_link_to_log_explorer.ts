/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { useMemo } from 'react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { useKibanaContextForPlugin } from '../utils';

export const useLinkToLogExplorer = ({ dataStreamStat }: { dataStreamStat: DataStreamStat }) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const [dataset, namespace] = dataStreamStat.title.split('-');
  const integration = dataStreamStat.integration?.name;

  const url = useMemo(() => {
    const query = {
      query: `data_stream.namespace : "${namespace}"`,
      language: 'kuery',
    };
    return share.url.locators
      .get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID)
      ?.getRedirectUrl({
        dataset,
        integration,
        query,
      });
  }, [dataset, integration, namespace, share.url.locators]);

  return url;
};
