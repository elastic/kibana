/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';

interface MustExist {
  bool: { must: Array<{ exists: { field: string } }> };
}

export const getMappingFilters = (threatMapping: ThreatMapping) => {
  const eventMappingFilter: Filter = {
    meta: {},
    query: { bool: { should: [] } },
  };
  const indicatorMappingFilter: Filter = {
    meta: {},
    query: { bool: { should: [] } },
  };

  return threatMapping.reduce(
    (acc, threatMap) => {
      const eventMustClause: MustExist = {
        bool: { must: [] },
      };
      const indicatorMustClause: MustExist = {
        bool: { must: [] },
      };
      threatMap.entries.forEach((entry) => {
        eventMustClause.bool.must.push({ exists: { field: entry.field } });
        indicatorMustClause.bool.must.push({ exists: { field: entry.value } });
      });
      eventMappingFilter.query?.bool.should.push(eventMustClause);
      indicatorMappingFilter.query?.bool.should.push(indicatorMustClause);
      return acc;
    },
    {
      eventMappingFilter,
      indicatorMappingFilter,
    }
  );
};
