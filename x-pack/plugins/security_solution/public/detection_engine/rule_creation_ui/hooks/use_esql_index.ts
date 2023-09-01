/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { isEsqlRule } from '../../../../common/detection_engine/utils';

/**
 * parses ESQL query and returns memoized array of indices
 * @param query
 * @returns
 */
export const useEsqlIndex = (query: Query['query'], ruleType: Type) => {
  const indexString = useMemo(() => {
    const esqlQuery = typeof query === 'string' && isEsqlRule(ruleType) ? query : undefined;
    return getIndexPatternFromESQLQuery(esqlQuery);
  }, [query, ruleType]);

  const esqlIndex = useMemo(() => {
    if (indexString === '') {
      return [];
    }
    return indexString.split(',').map((index) => index.trim());
  }, [indexString]);

  return esqlIndex;
};
