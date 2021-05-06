/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { EsQueryConfig, Filter, IIndexPattern, Query } from 'src/plugins/data/public';
import { convertToBuildEsQueryOrError } from '../lib/keury';
import { useAppToasts } from './use_app_toasts';

export const useInvalidFilterQuery = ({
  filterQuery,
  config,
  indexPattern,
  queries,
  filters,
}: {
  filterQuery?: string;
  config: EsQueryConfig;
  indexPattern: IIndexPattern;
  queries: Query[];
  filters: Filter[];
}) => {
  const { addError } = useAppToasts();

  useEffect(() => {
    if (filterQuery === undefined) {
      const error = convertToBuildEsQueryOrError({
        config,
        indexPattern,
        queries,
        filters,
      }) as Error;
      addError(error, { title: error.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQuery, addError]);
};
