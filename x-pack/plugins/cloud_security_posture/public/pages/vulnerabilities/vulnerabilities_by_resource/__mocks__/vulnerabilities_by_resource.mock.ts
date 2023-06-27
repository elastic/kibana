/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getVulnerabilitiesByResourceData = () => ({
  total: 2,
  total_vulnerabilities: 8,
  page: [
    {
      resource: { id: 'resource-id-1', name: 'resource-test-1' },
      cloud: { region: 'us-test-1' },
      vulnerabilities_count: 4,
      severity_map: {
        critical: 1,
        high: 1,
        medium: 1,
        low: 1,
      },
    },
    {
      resource: { id: 'resource-id-2', name: 'resource-test-2' },
      cloud: { region: 'us-test-1' },
      vulnerabilities_count: 4,
      severity_map: {
        critical: 1,
        high: 1,
        medium: 1,
        low: 1,
      },
    },
  ],
});
