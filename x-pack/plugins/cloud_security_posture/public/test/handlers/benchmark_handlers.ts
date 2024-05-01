/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

export const defaultBenchmarks = http.get(
  'http://localhost/internal/cloud_security_posture/benchmarks',
  ({ request }) => {
    // package_policy_name=&per_page=100&page=1&sort_field=package_policy.name&sort_order=asc
    const url = new URL(request.url);
    // const packagePolicyName = url.searchParams.get('package_policy_name');
    const perPage = url.searchParams.get('per_page');
    const page = url.searchParams.get('page');
    // const sortField = url.searchParams.get('sort_field');

    console.log('perPage:', perPage);

    return HttpResponse.json({
      data: [
        {
          id: 'benchmark_id',
          type: 'benchmark',
          attributes: {
            benchmark_id: 'benchmark_id',
            benchmark_version: '1.0.0',
            benchmark_title: 'Benchmark Title',
            benchmark_description: 'Benchmark Description',
            benchmark_reference: 'https://example.com',
            benchmark_license: 'MIT',
            benchmark_license_version: '1.0.0',
            benchmark_license_url: 'https://example.com',
            benchmark_cis_version: '1.0.0',
            benchmark_cis_level: '1',
            benchmark_cis_profile: 'cis_profile',
            benchmark_cis_categories: ['category1', 'category2'],
            benchmark_cis_controls: [
              {
                control_id: 'control_id',
                control_title: 'Control Title',
                control_description: 'Control Description',
                control_rationale: 'Control Rationale',
                control_audit: 'Control Audit',
                control_remediation: 'Control Remediation',
                control_cis_level: '1',
                control_cis_version: '1.0.0',
                control_cis_scored: true,
                control_cis_profile: 'cis_profile',
                control_cis_categories: ['category1', 'category2'],
                control_cis_references: ['https://example.com'],
              },
            ],
          },
        },
      ],
      page,
      per_page: perPage,
      total: 1,
    });
  }
);
