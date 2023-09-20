/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { getIndexListFromEsqlQuery } from '@kbn/securitysolution-utils';
import type { Query } from '@kbn/es-query';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { isEsqlRule } from '../../../../common/detection_engine/utils';

/**
 * parses ES|QL query and returns memoized array of indices
 * @param query
 * @returns
 */
export const useEsqlIndex = (query: Query['query'], ruleType: Type) => {
  const index = useMemo(() => {
    const esqlQuery = typeof query === 'string' && isEsqlRule(ruleType) ? query : undefined;
    return getIndexListFromEsqlQuery(esqlQuery);
  }, [query, ruleType]);

  return index;
};
