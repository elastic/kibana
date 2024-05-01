/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

const encoder = new TextEncoder();

export const handlers = [
  http.get('http://localhost:5601/internal/cloud_security_posture/status', () => {
    return HttpResponse.json({
      cspm: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 1,
      },
      kspm: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'not-empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
      installedPackageVersion: '1.9.0-preview03',
    });
  }),
  http.get('http://localhost:5601/internal/data_views/fields', () => {
    return HttpResponse.json({
      fields: [
        {
          name: '@timestamp',
          type: 'date',
          esTypes: ['date'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          name: '_id',
          type: 'string',
          esTypes: ['_id'],
          searchable: true,
          aggregatable: false,
          readFromDocValues: false,
          metadata_field: true,
        },
        {
          name: '_index',
          type: 'string',
          esTypes: ['_index'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: false,
          metadata_field: true,
        },
        {
          name: '_score',
          type: 'number',
          searchable: false,
          aggregatable: false,
          readFromDocValues: false,
          metadata_field: true,
        },
        {
          name: '_source',
          type: '_source',
          esTypes: ['_source'],
          searchable: false,
          aggregatable: false,
          readFromDocValues: false,
          metadata_field: true,
        },
        {
          name: 'agent.ephemeral_id',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          name: 'agent.id',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          name: 'agent.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          name: 'agent.type',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          name: 'rule.version',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          metadata_field: false,
        },
      ],
      indices: ['logs-cloud_security_posture.findings_latest-default'],
    });
  }),
  http.get('http://localhost:5601/internal/bsearch', () => {
    const stream = new ReadableStream({
      start(controller) {
        // Encode the string chunks using "TextEncoder".
        controller.enqueue(
          encoder.encode(
            JSON.stringify([
              {
                request: {
                  params: {
                    index: 'logs-cloud_security_posture.findings_latest-*',
                    sort: [
                      {
                        '@timestamp': 'desc',
                      },
                    ],
                    size: 500,
                    aggs: {
                      count: {
                        terms: {
                          field: 'result.evaluation',
                        },
                      },
                    },
                    ignore_unavailable: false,
                    query: {
                      bool: {
                        must: [],
                        filter: [
                          {
                            match_phrase: {
                              'rule.benchmark.rule_number': '5.1.5',
                            },
                          },
                          {
                            match_phrase: {
                              'resource.id': '3dcd461e-4f16-50d9-8f55-30a510bbc587',
                            },
                          },
                          {
                            range: {
                              '@timestamp': {
                                gte: 'now-26h',
                                lte: 'now',
                              },
                            },
                          },
                        ],
                        should: [],
                        must_not: [
                          {
                            bool: {
                              must: [
                                {
                                  term: {
                                    'rule.benchmark.id': 'cis_aws',
                                  },
                                },
                                {
                                  term: {
                                    'rule.benchmark.version': 'v1.5.0',
                                  },
                                },
                                {
                                  term: {
                                    'rule.benchmark.rule_number': '1.5',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                options: {
                  strategy: 'ese',
                  isSearchStored: false,
                  executionContext: {
                    type: 'application',
                    name: 'securitySolutionUI',
                    url: '/app/security/cloud_security_posture/findings/configurations',
                    page: '/cloud_security_posture/findings/configurations',
                  },
                },
              },
            ])
          )
        );
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }),
];
