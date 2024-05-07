/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getIndexListFromIndexString } from '@kbn/securitysolution-utils';

import type { Query } from '@kbn/es-query';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { isEsqlRule } from '../../../../common/detection_engine/utils';

/**
 * parses ES|QL query and returns memoized array of indices
 * @param query - ES|QL query to retrieve index from
 * @param ruleType - rule type value
 * @param isQueryReadEnabled - if not enabled, return empty array. Useful if we know form or query is not valid and we don't want to retrieve index
 * @returns
 */
export const useEsqlIndex = (
  query: Query['query'],
  ruleType: Type,
  isQueryReadEnabled: boolean | undefined
) => {
  const indexString = useMemo(() => {
    if (!isQueryReadEnabled) {
      return '';
    }
    const esqlQuery = typeof query === 'string' && isEsqlRule(ruleType) ? query : undefined;
    return getIndexPatternFromESQLQuery(esqlQuery);
  }, [query, isQueryReadEnabled, ruleType]);

  const index = useMemo(() => getIndexListFromIndexString(indexString), [indexString]);
  return index;
};
