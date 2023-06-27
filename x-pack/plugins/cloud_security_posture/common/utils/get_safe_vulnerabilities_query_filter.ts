/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { VULNERABILITIES_ENUMERATION, VULNERABILITIES_SEVERITY } from '../constants';

export const getSafeVulnerabilitiesQueryFilter = (query?: QueryDslQueryContainer) => ({
  ...query,
  bool: {
    ...query?.bool,
    filter: [
      ...((query?.bool?.filter as []) || []),
      {
        bool: {
          minimum_should_match: 1,
          should: [
            { match_phrase: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.CRITICAL } },
            { match_phrase: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.HIGH } },
            { match_phrase: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.MEDIUM } },
            { match_phrase: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.LOW } },
          ],
        },
      },
      { exists: { field: 'vulnerability.score.base' } },
      { exists: { field: 'vulnerability.score.version' } },
      { exists: { field: 'vulnerability.severity' } },
      { exists: { field: 'resource.id' } },
      { exists: { field: 'resource.name' } },
      { match_phrase: { 'vulnerability.enumeration': VULNERABILITIES_ENUMERATION } },
    ],
  },
});
