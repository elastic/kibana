/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDynamicDataViewFetcher } from '../../../../hooks/use_dynamic_data_view';
import {
  IndexPattern,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';

export function useIndexPattern() {
  const { dataView } = useDynamicDataViewFetcher();

  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (dataView?.title) {
      return indexPatterns.create({
        pattern: dataView?.title,
      } as IndexPatternSpec);
    }
  }, [dataView?.title, indexPatterns]);

  return { indexPatternTitle: dataView?.title, indexPattern: data };
}
