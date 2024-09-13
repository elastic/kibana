/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CustomFieldTypes } from '../../../common/types/domain';
import type {
  AttachmentAggregationResult,
  AttachmentFrameworkAggsResult,
  CaseAggregationResult,
  FileAttachmentAggregationResults,
} from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getAttachmentsFrameworkStats,
  getBucketFromAggregation,
  getConnectorsCardinalityAggregationQuery,
  getCountsAggregationQuery,
  getCountsAndMaxData,
  getCountsFromBuckets,
  getCustomFieldsTelemetry,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
  getSolutionValues,
} from './utils';

describe('utils', () => {
  describe('getSolutionValues', () => {
    const counts = {
      buckets: [
        { doc_count: 1, key: 1 },
        { doc_count: 2, key: 2 },
        { doc_count: 3, key: 3 },
      ],
    };

    const assignees = {
      assigneeFilters: {
        buckets: {
          atLeastOne: {
            doc_count: 0,
          },
          zero: {
            doc_count: 100,
          },
        },
      },
      totalAssignees: { value: 5 },
    };

    const caseSolutionValues = {
      counts,
      ...assignees,
    };

    const caseAggsResult: CaseAggregationResult = {
      users: { value: 1 },
      tags: { value: 2 },
      ...assignees,
      counts,
      securitySolution: { ...caseSolutionValues },
      observability: { ...caseSolutionValues },
      cases: { ...caseSolutionValues },
      syncAlerts: {
        buckets: [
          {
            key: 0,
            doc_count: 1,
          },
          {
            key: 1,
            doc_count: 1,
          },
        ],
      },
      status: {
        buckets: [
          {
            key: 'open',
            doc_count: 2,
          },
        ],
      },
      totalsByOwner: {
        buckets: [
          {
            key: 'observability',
            doc_count: 1,
          },
          {
            key: 'securitySolution',
            doc_count: 5,
          },
          {
            key: 'cases',
            doc_count: 1,
          },
        ],
      },
    };

    const attachmentFramework: AttachmentFrameworkAggsResult = {
      externalReferenceTypes: {
        buckets: [
          {
            doc_count: 5,
            key: '.osquery',
            references: {
              cases: {
                max: {
                  value: 10,
                },
              },
            },
          },
          {
            doc_count: 5,
            key: '.files',
            references: {
              cases: {
                max: {
                  value: 10,
                },
              },
            },
          },
        ],
      },
      persistableReferenceTypes: {
        buckets: [
          {
            doc_count: 5,
            key: '.ml',
            references: {
              cases: {
                max: {
                  value: 10,
                },
              },
            },
          },
          {
            doc_count: 5,
            key: '.files',
            references: {
              cases: {
                max: {
                  value: 10,
                },
              },
            },
          },
        ],
      },
    };

    const attachmentAggsResult: AttachmentAggregationResult = {
      securitySolution: { ...attachmentFramework },
      observability: { ...attachmentFramework },
      cases: { ...attachmentFramework },
      participants: {
        value: 5,
      },
      ...attachmentFramework,
    };

    const filesRes: FileAttachmentAggregationResults = {
      securitySolution: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      observability: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      cases: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      averageSize: { value: 500 },
      topMimeTypes: {
        buckets: [
          {
            doc_count: 5,
            key: 'image/png',
          },
          {
            doc_count: 1,
            key: 'application/json',
          },
        ],
      },
    };

    it('constructs the solution values correctly', () => {
      expect(
        getSolutionValues({
          caseAggregations: caseAggsResult,
          attachmentAggregations: attachmentAggsResult,
          filesAggregations: filesRes,
          owner: 'securitySolution',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "assignees": Object {
            "total": 5,
            "totalWithAtLeastOne": 0,
            "totalWithZero": 100,
          },
          "attachmentFramework": Object {
            "externalAttachments": Array [
              Object {
                "average": 1,
                "maxOnACase": 10,
                "total": 5,
                "type": ".osquery",
              },
              Object {
                "average": 1,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
            "files": Object {
              "average": 1,
              "averageSize": 500,
              "maxOnACase": 10,
              "topMimeTypes": Array [
                Object {
                  "count": 5,
                  "name": "image/png",
                },
                Object {
                  "count": 1,
                  "name": "application/json",
                },
              ],
              "total": 5,
            },
            "persistableAttachments": Array [
              Object {
                "average": 1,
                "maxOnACase": 10,
                "total": 5,
                "type": ".ml",
              },
              Object {
                "average": 1,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
          },
          "daily": 3,
          "monthly": 1,
          "total": 5,
          "weekly": 2,
        }
      `);
      expect(
        getSolutionValues({
          caseAggregations: caseAggsResult,
          attachmentAggregations: attachmentAggsResult,
          filesAggregations: filesRes,
          owner: 'cases',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "assignees": Object {
            "total": 5,
            "totalWithAtLeastOne": 0,
            "totalWithZero": 100,
          },
          "attachmentFramework": Object {
            "externalAttachments": Array [
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".osquery",
              },
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
            "files": Object {
              "average": 5,
              "averageSize": 500,
              "maxOnACase": 10,
              "topMimeTypes": Array [
                Object {
                  "count": 5,
                  "name": "image/png",
                },
                Object {
                  "count": 1,
                  "name": "application/json",
                },
              ],
              "total": 5,
            },
            "persistableAttachments": Array [
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".ml",
              },
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
          },
          "daily": 3,
          "monthly": 1,
          "total": 1,
          "weekly": 2,
        }
      `);
      expect(
        getSolutionValues({
          caseAggregations: caseAggsResult,
          attachmentAggregations: attachmentAggsResult,
          filesAggregations: filesRes,
          owner: 'observability',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "assignees": Object {
            "total": 5,
            "totalWithAtLeastOne": 0,
            "totalWithZero": 100,
          },
          "attachmentFramework": Object {
            "externalAttachments": Array [
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".osquery",
              },
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
            "files": Object {
              "average": 5,
              "averageSize": 500,
              "maxOnACase": 10,
              "topMimeTypes": Array [
                Object {
                  "count": 5,
                  "name": "image/png",
                },
                Object {
                  "count": 1,
                  "name": "application/json",
                },
              ],
              "total": 5,
            },
            "persistableAttachments": Array [
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".ml",
              },
              Object {
                "average": 5,
                "maxOnACase": 10,
                "total": 5,
                "type": ".files",
              },
            ],
          },
          "daily": 3,
          "monthly": 1,
          "total": 1,
          "weekly": 2,
        }
      `);
    });
  });

  describe('getAttachmentsFrameworkStats', () => {
    it('returns empty stats if the aggregation is undefined', () => {
      expect(getAttachmentsFrameworkStats({ totalCasesForOwner: 0 })).toMatchInlineSnapshot(`
        Object {
          "attachmentFramework": Object {
            "externalAttachments": Array [],
            "files": Object {
              "average": 0,
              "averageSize": 0,
              "maxOnACase": 0,
              "topMimeTypes": Array [],
              "total": 0,
            },
            "persistableAttachments": Array [],
          },
        }
      `);
    });

    describe('externalAttachments', () => {
      const attachmentFramework: AttachmentFrameworkAggsResult = {
        externalReferenceTypes: {
          buckets: [
            {
              doc_count: 5,
              key: '.osquery',
              references: {
                cases: {
                  max: {
                    value: 10,
                  },
                },
              },
            },
            {
              doc_count: 10,
              key: '.files',
              references: {
                cases: {
                  max: {
                    value: 10,
                  },
                },
              },
            },
          ],
        },
        persistableReferenceTypes: {
          buckets: [],
        },
      };

      it('populates the externalAttachments array', () => {
        const stats = getAttachmentsFrameworkStats({
          attachmentAggregations: attachmentFramework,
          totalCasesForOwner: 5,
        });

        expect(stats.attachmentFramework.externalAttachments[0]).toEqual({
          // the average is 5 from the aggs result / 5 from the function parameter
          average: 1,
          maxOnACase: 10,
          total: 5,
          type: '.osquery',
        });

        expect(stats.attachmentFramework.externalAttachments[1]).toEqual({
          // the average is 10 from the aggs result / 5 from the function parameter
          average: 2,
          maxOnACase: 10,
          total: 10,
          type: '.files',
        });
      });
    });

    describe('persistableAttachments', () => {
      const attachmentFramework: AttachmentFrameworkAggsResult = {
        persistableReferenceTypes: {
          buckets: [
            {
              doc_count: 5,
              key: '.osquery',
              references: {
                cases: {
                  max: {
                    value: 10,
                  },
                },
              },
            },
            {
              doc_count: 10,
              key: '.files',
              references: {
                cases: {
                  max: {
                    value: 10,
                  },
                },
              },
            },
          ],
        },
        externalReferenceTypes: {
          buckets: [],
        },
      };

      it('populates the externalAttachments array', () => {
        const stats = getAttachmentsFrameworkStats({
          attachmentAggregations: attachmentFramework,
          totalCasesForOwner: 5,
        });

        expect(stats.attachmentFramework.persistableAttachments[0]).toEqual({
          // the average is 5 from the aggs result / 5 from the function parameter
          average: 1,
          maxOnACase: 10,
          total: 5,
          type: '.osquery',
        });

        expect(stats.attachmentFramework.persistableAttachments[1]).toEqual({
          // the average is 10 from the aggs result / 5 from the function parameter
          average: 2,
          maxOnACase: 10,
          total: 10,
          type: '.files',
        });
      });
    });

    describe('files', () => {
      it('rounds the average file size when it is a decimal', () => {
        const attachmentFramework: AttachmentFrameworkAggsResult = {
          externalReferenceTypes: {
            buckets: [
              {
                doc_count: 5,
                key: '.files',
                references: {
                  cases: {
                    max: {
                      value: 10,
                    },
                  },
                },
              },
            ],
          },
          persistableReferenceTypes: {
            buckets: [],
          },
        };

        expect(
          getAttachmentsFrameworkStats({
            attachmentAggregations: attachmentFramework,
            totalCasesForOwner: 5,
            filesAggregations: {
              averageSize: { value: 1.1 },
              topMimeTypes: {
                buckets: [],
              },
            },
          }).attachmentFramework.files
        ).toMatchInlineSnapshot(`
          Object {
            "average": 1,
            "averageSize": 1,
            "maxOnACase": 10,
            "topMimeTypes": Array [],
            "total": 5,
          }
        `);
      });

      it('sets the average file size to 0 when the aggregation does not exist', () => {
        const attachmentFramework: AttachmentFrameworkAggsResult = {
          externalReferenceTypes: {
            buckets: [
              {
                doc_count: 5,
                key: '.files',
                references: {
                  cases: {
                    max: {
                      value: 10,
                    },
                  },
                },
              },
            ],
          },
          persistableReferenceTypes: {
            buckets: [],
          },
        };

        expect(
          getAttachmentsFrameworkStats({
            attachmentAggregations: attachmentFramework,
            totalCasesForOwner: 5,
          }).attachmentFramework.files
        ).toMatchInlineSnapshot(`
          Object {
            "average": 1,
            "averageSize": 0,
            "maxOnACase": 10,
            "topMimeTypes": Array [],
            "total": 5,
          }
        `);
      });

      it('sets the files stats to empty when the file aggregation results is the empty version', () => {
        const attachmentFramework: AttachmentFrameworkAggsResult = {
          externalReferenceTypes: {
            buckets: [
              {
                doc_count: 5,
                key: '.osquery',
                references: {
                  cases: {
                    max: {
                      value: 10,
                    },
                  },
                },
              },
            ],
          },
          persistableReferenceTypes: {
            buckets: [],
          },
        };

        expect(
          getAttachmentsFrameworkStats({
            attachmentAggregations: attachmentFramework,
            totalCasesForOwner: 5,
            filesAggregations: {
              averageSize: { value: 0 },
              topMimeTypes: {
                buckets: [],
              },
            },
          }).attachmentFramework.files
        ).toMatchInlineSnapshot(`
          Object {
            "average": 0,
            "averageSize": 0,
            "maxOnACase": 0,
            "topMimeTypes": Array [],
            "total": 0,
          }
        `);
      });

      it('sets the files stats using the file aggregation result', () => {
        const attachmentFramework: AttachmentFrameworkAggsResult = {
          externalReferenceTypes: {
            buckets: [
              {
                doc_count: 5,
                key: '.files',
                references: {
                  cases: {
                    max: {
                      value: 10,
                    },
                  },
                },
              },
            ],
          },
          persistableReferenceTypes: {
            buckets: [],
          },
        };

        expect(
          getAttachmentsFrameworkStats({
            attachmentAggregations: attachmentFramework,
            filesAggregations: {
              averageSize: { value: 500 },
              topMimeTypes: {
                buckets: [
                  {
                    doc_count: 5,
                    key: 'image/png',
                  },
                  {
                    doc_count: 1,
                    key: 'application/json',
                  },
                ],
              },
            },
            totalCasesForOwner: 5,
          }).attachmentFramework.files
        ).toMatchInlineSnapshot(`
          Object {
            "average": 1,
            "averageSize": 500,
            "maxOnACase": 10,
            "topMimeTypes": Array [
              Object {
                "count": 5,
                "name": "image/png",
              },
              Object {
                "count": 1,
                "name": "application/json",
              },
            ],
            "total": 5,
          }
        `);
      });

      it('sets the top mime types when a file entry is not found', () => {
        const attachmentFramework: AttachmentFrameworkAggsResult = {
          externalReferenceTypes: {
            buckets: [],
          },
          persistableReferenceTypes: {
            buckets: [],
          },
        };

        expect(
          getAttachmentsFrameworkStats({
            attachmentAggregations: attachmentFramework,
            filesAggregations: {
              averageSize: { value: 0 },
              topMimeTypes: {
                buckets: [
                  {
                    doc_count: 5,
                    key: 'image/png',
                  },
                  {
                    doc_count: 1,
                    key: 'application/json',
                  },
                ],
              },
            },
            totalCasesForOwner: 5,
          }).attachmentFramework.files
        ).toMatchInlineSnapshot(`
          Object {
            "average": 0,
            "averageSize": 0,
            "maxOnACase": 0,
            "topMimeTypes": Array [
              Object {
                "count": 5,
                "name": "image/png",
              },
              Object {
                "count": 1,
                "name": "application/json",
              },
            ],
            "total": 0,
          }
        `);
      });
    });
  });

  describe('getCountsAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getCountsAggregationQuery('test')).toEqual({
        counts: {
          date_range: {
            field: 'test.attributes.created_at',
            format: 'dd/MM/YYYY',
            ranges: [
              { from: 'now-1d', to: 'now' },
              { from: 'now-1w', to: 'now' },
              { from: 'now-1M', to: 'now' },
            ],
          },
        },
      });
    });
  });

  describe('getMaxBucketOnCaseAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getMaxBucketOnCaseAggregationQuery('test')).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            cases: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                ids: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
                max: {
                  max_bucket: {
                    buckets_path: 'ids._count',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getReferencesAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(
        getReferencesAggregationQuery({ savedObjectType: 'test', referenceType: 'cases' })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('returns the correct query when changing the agg', () => {
      expect(
        getReferencesAggregationQuery({
          savedObjectType: 'test',
          referenceType: 'cases',
          agg: 'cardinality',
        })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getConnectorsCardinalityAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getConnectorsCardinalityAggregationQuery()).toEqual({
        references: {
          nested: {
            path: 'cases-user-actions.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'cases-user-actions.references.type': 'action',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'cases-user-actions.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getCountsFromBuckets', () => {
    it('returns the correct counts', () => {
      const buckets = [
        { doc_count: 1, key: 1 },
        { doc_count: 2, key: 2 },
        { doc_count: 3, key: 3 },
      ];

      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 3,
        weekly: 2,
        monthly: 1,
      });
    });

    it('returns zero counts when the bucket do not have the doc_count field', () => {
      const buckets = [{}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the bucket is undefined', () => {
      // @ts-expect-error
      expect(getCountsFromBuckets(undefined)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the doc_count field is missing in some buckets', () => {
      const buckets = [{ doc_count: 1, key: 1 }, {}, {}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 1,
      });
    });
  });

  describe('getCountsAndMaxData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 1, key: 1 },
            { doc_count: 2, key: 2 },
            { doc_count: 3, key: 3 },
          ],
        },
        references: { cases: { max: { value: 1 } } },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the correct counts and max data', async () => {
      const res = await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          maxOnACase: 1,
        },
      });
    });

    it('returns zero data if the response aggregation is not as expected', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      const res = await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 0,
          weekly: 0,
          monthly: 0,
          maxOnACase: 0,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          counts: {
            date_range: {
              field: 'test.attributes.created_at',
              format: 'dd/MM/YYYY',
              ranges: [
                {
                  from: 'now-1d',
                  to: 'now',
                },
                {
                  from: 'now-1w',
                  to: 'now',
                },
                {
                  from: 'now-1M',
                  to: 'now',
                },
              ],
            },
          },
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'test.references.id',
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids._count',
                    },
                  },
                },
                filter: {
                  term: {
                    'test.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'test.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'test',
      });
    });
  });

  describe('getBucketFromAggregation', () => {
    it('returns the buckets', () => {
      expect(
        getBucketFromAggregation({
          aggs: { test: { deep: { buckets: [{ doc_count: 1, key: 1 }] } } },
          key: 'test.deep',
        })
      ).toEqual([{ doc_count: 1, key: 1 }]);
    });

    it('returns an empty array if the path does not exist', () => {
      expect(
        getBucketFromAggregation({
          key: 'test.deep',
        })
      ).toEqual([]);
    });
  });

  describe('findValueInBuckets', () => {
    it('find the value in the bucket', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];
      expect(findValueInBuckets(buckets, 'test')).toBe(1);
    });

    it('return zero if the value is not found', () => {
      const buckets = [{ doc_count: 1, key: 'test' }];
      expect(findValueInBuckets(buckets, 'not-in-the-bucket')).toBe(0);
    });
  });

  describe('getAggregationsBuckets', () => {
    it('return aggregation buckets', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];

      const aggs = {
        foo: { baz: { buckets } },
        bar: { buckets },
      };

      expect(getAggregationsBuckets({ aggs, keys: ['foo.baz', 'bar'] })).toEqual({
        'foo.baz': buckets,
        bar: buckets,
      });
    });
  });

  describe('getOnlyAlertsCommentsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyAlertsCommentsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-comments.attributes.type',
            isQuoted: false,
          },
          {
            type: 'literal',
            value: 'alert',
            isQuoted: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });

  describe('getOnlyConnectorsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyConnectorsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-user-actions.attributes.type',
            isQuoted: false,
          },
          {
            type: 'literal',
            value: 'connector',
            isQuoted: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });

  describe('getCustomFieldsTelemetry', () => {
    const customFieldsMock = [
      {
        key: 'foobar1',
        label: 'foobar1',
        type: CustomFieldTypes.TEXT,
        required: false,
      },
      {
        key: 'foobar2',
        label: 'foobar2',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
      {
        key: 'foobar3',
        label: 'foobar3',
        type: 'foo',
        required: true,
      },
      {
        key: 'foobar4',
        label: 'foobar4',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
    ];

    it('returns customFields telemetry correctly', () => {
      expect(getCustomFieldsTelemetry(customFieldsMock)).toEqual({
        totalsByType: {
          text: 1,
          toggle: 2,
          foo: 1,
        },
        totals: 4,
        required: 3,
      });
    });

    it('returns correctly when customFields undefined', () => {
      expect(getCustomFieldsTelemetry(undefined)).toEqual({
        totalsByType: {},
        totals: 0,
        required: 0,
      });
    });

    it('returns correctly when customFields empty', () => {
      expect(getCustomFieldsTelemetry([])).toEqual({
        totalsByType: {},
        totals: 0,
        required: 0,
      });
    });
  });
});
