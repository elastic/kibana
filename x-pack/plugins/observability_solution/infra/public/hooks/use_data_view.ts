/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { useKibanaContextForPlugin } from './use_kibana';

export const TIMESTAMP_FIELD = '@timestamp';
export const DATA_VIEW_PREFIX = 'infra_metrics';

export const generateDataViewId = (index: string) => {
  // generates a unique but the same uuid as long as the index pattern doesn't change
  return `${DATA_VIEW_PREFIX}_${uuidv5(index, uuidv5.DNS)}`;
};

export const useDataView = ({ index }: { index?: string }) => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const state = useAsyncRetry(async () => {
    if (!index) {
      return Promise.resolve(undefined);
    }

    return dataViews.get(index, false).catch(() =>
      // if data view doesn't exist, create an ad-hoc one
      dataViews.create({
        id: generateDataViewId(index),
        title: index,
        timeFieldName: TIMESTAMP_FIELD,
      })
    );
  }, [index]);

  const { value: dataView, loading, error, retry } = state;

  return {
    index,
    dataView,
    loading,
    retry,
    error,
  };
};
