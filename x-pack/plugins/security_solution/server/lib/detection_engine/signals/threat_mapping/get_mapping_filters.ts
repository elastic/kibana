/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';

interface ShouldExist {
  bool: { should: Array<{ exists: { field: string } }> };
}

export const getMappingFilters = (threatMapping: ThreatMapping) => {
  const eventMappingFilters: Filter[] = [];
  const indicatorMappingFilters: Filter[] = [];

  return threatMapping.reduce(
    (acc, threatMap) => {
      const eventShouldClause: ShouldExist = {
        bool: { should: [] },
      };
      const indicatorShouldClause: ShouldExist = {
        bool: { should: [] },
      };
      threatMap.entries.forEach((entry) => {
        eventShouldClause.bool.should.push({ exists: { field: entry.field } });
        indicatorShouldClause.bool.should.push({ exists: { field: entry.value } });
      });
      acc.eventMappingFilters.push({ meta: {}, query: { bool: { filter: [eventShouldClause] } } });
      acc.indicatorMappingFilters.push({
        meta: {},
        query: { bool: { filter: [indicatorShouldClause] } },
      });
      return acc;
    },
    {
      eventMappingFilters,
      indicatorMappingFilters,
    }
  );
};
