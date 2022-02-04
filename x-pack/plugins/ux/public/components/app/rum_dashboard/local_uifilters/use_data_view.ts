/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import { useDynamicDataViewFetcher } from '../../../../hooks/use_dynamic_data_view';

export function useDataView() {
  const { dataView } = useDynamicDataViewFetcher();

  const {
    services: {
      data: { dataViews },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (dataView?.title) {
      return dataViews.create({
        title: dataView?.title,
      });
    }
  }, [dataView?.title, dataViews]);

  return { dataViewTitle: dataView?.title, dataView: data };
}
