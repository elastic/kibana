/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternSpec } from '../../../../../../../../src/plugins/data/common/index_patterns/types';
import type { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public/types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public/context/context';
import { useDynamicIndexPatternFetcher } from '../../../../hooks/use_dynamic_index_pattern';
import { useFetcher } from '../../../../hooks/use_fetcher';

export function useIndexPattern() {
  const { indexPattern: indexPatternDynamic } = useDynamicIndexPatternFetcher();

  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (indexPatternDynamic?.title) {
      return indexPatterns.create({
        pattern: indexPatternDynamic?.title,
      } as IndexPatternSpec);
    }
  }, [indexPatternDynamic?.title, indexPatterns]);

  return { indexPatternTitle: indexPatternDynamic?.title, indexPattern: data };
}
