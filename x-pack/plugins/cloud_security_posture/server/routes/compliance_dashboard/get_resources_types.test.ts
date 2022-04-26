/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResourceTypeFromAggs, ResourceTypeBucket } from './get_resources_types';

const resourceTypeBuckets: ResourceTypeBucket[] = [
  {
    key: 'foo_type',
    doc_count: 41,
    failed_findings: {
      doc_count: 30,
    },
    passed_findings: {
      doc_count: 11,
    },
  },
  {
    key: 'boo_type',
    doc_count: 11,
    failed_findings: {
      doc_count: 5,
    },
    passed_findings: {
      doc_count: 6,
    },
  },
];

describe('getResourceTypeFromAggs', () => {
  it('should return value matching ComplianceDashboardData["resourcesTypes"]', async () => {
    const resourceTypes = getResourceTypeFromAggs(resourceTypeBuckets);
    expect(resourceTypes).toEqual([
      {
        name: 'foo_type',
        totalFindings: 41,
        totalFailed: 30,
        totalPassed: 11,
      },
      {
        name: 'boo_type',
        totalFindings: 11,
        totalFailed: 5,
        totalPassed: 6,
      },
    ]);
  });
});
