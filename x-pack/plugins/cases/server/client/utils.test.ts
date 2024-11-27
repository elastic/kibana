/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v1 as uuidv1 } from 'uuid';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { KueryNode } from '@kbn/es-query';
import { toElasticsearchQuery, toKqlExpression } from '@kbn/es-query';

import { createSavedObjectsSerializerMock } from './mocks';
import {
  arraysDifference,
  buildAttachmentRequestFromFileJSON,
  buildFilter,
  buildRangeFilter,
  constructQueryOptions,
  constructSearch,
  convertSortField,
  transformTemplateCustomFields,
} from './utils';
import { CasePersistedSeverity, CasePersistedStatus } from '../common/types/case';
import type { CustomFieldsConfiguration } from '../../common/types/domain';
import { CaseSeverity, CaseStatuses, CustomFieldTypes } from '../../common/types/domain';
import type { FileJSON } from '@kbn/shared-ux-file-types';

describe('utils', () => {
  describe('buildFilter', () => {
    it('returns undefined if filters is undefined', () => {
      expect(buildFilter({ filters: undefined, field: 'abc', operator: 'or' })).toBeUndefined();
    });

    it('returns undefined if filters is is an empty array', () => {
      expect(buildFilter({ filters: [], field: 'abc', operator: 'or' })).toBeUndefined();
    });

    it('returns a KueryNode using or operator', () => {
      expect(buildFilter({ filters: ['value1'], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "value1",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("returns multiple nodes or'd together", () => {
      expect(buildFilter({ filters: ['value1', 'value2'], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value1",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value2",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('does not escape special kql characters in the filter values', () => {
      const specialCharacters = 'awesome:()\\<>"*';

      expect(buildFilter({ filters: [specialCharacters], field: 'abc', operator: 'or' }))
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "awesome:()\\\\<>\\"*",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });
  });

  describe('convertSortField', () => {
    it('transforms status correctly', () => {
      expect(convertSortField('status')).toBe('status');
    });

    it('transforms createdAt correctly', () => {
      expect(convertSortField('createdAt')).toBe('created_at');
    });

    it('transforms updatedAt correctly', () => {
      expect(convertSortField('updatedAt')).toBe('updated_at');
    });

    it('transforms closedAt correctly', () => {
      expect(convertSortField('closedAt')).toBe('closed_at');
    });

    it('transforms title correctly', () => {
      expect(convertSortField('title')).toBe('title.keyword');
    });

    it('transforms default correctly', () => {
      expect(convertSortField(undefined)).toBe('created_at');
    });
  });

  describe('buildRangeFilter', () => {
    it('returns undefined if both the from and or are undefined', () => {
      const node = buildRangeFilter({});
      expect(node).toBeFalsy();
    });

    it('returns undefined if both the from and or are null', () => {
      // @ts-expect-error
      const node = buildRangeFilter({ from: null, to: null });
      expect(node).toBeFalsy();
    });

    it('creates a range filter with only the from correctly', () => {
      const node = buildRangeFilter({ from: 'now-1M' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "range": Object {
                  "cases.attributes.created_at": Object {
                    "gte": "now-1M",
                  },
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter with only the to correctly', () => {
      const node = buildRangeFilter({ to: 'now' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "range": Object {
                  "cases.attributes.created_at": Object {
                    "lte": "now",
                  },
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter correctly', () => {
      const node = buildRangeFilter({ from: 'now-1M', to: 'now' });
      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "cases.attributes.created_at": Object {
                          "gte": "now-1M",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "cases.attributes.created_at": Object {
                          "lte": "now",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a range filter with different field and saved object type provided', () => {
      const node = buildRangeFilter({
        from: 'now-1M',
        to: 'now',
        field: 'test',
        savedObjectType: 'test-type',
      });

      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "test-type.attributes.test": Object {
                          "gte": "now-1M",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        "test-type.attributes.test": Object {
                          "lte": "now",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    it('escapes the query correctly', () => {
      const node = buildRangeFilter({
        from: '2022-04-27T12:55:47.576Z',
        to: '2022-04-27T12:56:47.576Z',
        field: '<weird field)',
        savedObjectType: '.weird SO)',
      });

      expect(toElasticsearchQuery(node!)).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        ".weird SO).attributes.<weird field)": Object {
                          "gte": "2022-04-27T12:55:47.576Z",
                        },
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "range": Object {
                        ".weird SO).attributes.<weird field)": Object {
                          "lte": "2022-04-27T12:56:47.576Z",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });
  });

  describe('constructQueryOptions', () => {
    it('creates a filter with the tags', () => {
      const { filter } = constructQueryOptions({ tags: ['tag1', 'tag2'] });
      expect(filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.tags",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "tag1",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.tags",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "tag2",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('creates a filter with the reporters', () => {
      expect(constructQueryOptions({ reporters: ['bob', 'sam'] }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "bob",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "bob",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('creates a filter with the owner', () => {
      expect(constructQueryOptions({ owner: 'observability' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.owner",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "observability",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it.each([
      [CaseStatuses.open, CasePersistedStatus.OPEN],
      [CaseStatuses['in-progress'], CasePersistedStatus.IN_PROGRESS],
      [CaseStatuses.closed, CasePersistedStatus.CLOSED],
    ])('creates a filter for status "%s"', (status, expectedStatus) => {
      expect(constructQueryOptions({ status }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.status",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "`);
    });

    it('should create a filter for multiple status values', () => {
      const status = [CaseStatuses.open, CaseStatuses['in-progress']];
      expect(constructQueryOptions({ status }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.status",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "0",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.status",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "10",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it.each([
      [CaseSeverity.LOW, CasePersistedSeverity.LOW],
      [CaseSeverity.MEDIUM, CasePersistedSeverity.MEDIUM],
      [CaseSeverity.HIGH, CasePersistedSeverity.HIGH],
      [CaseSeverity.CRITICAL, CasePersistedSeverity.CRITICAL],
    ])('creates a filter for severity "%s"', (severity, expectedSeverity) => {
      expect(constructQueryOptions({ severity }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "cases.attributes.severity",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "`);
    });

    it('should create a filter for multiple severity values', () => {
      const severity = [CaseSeverity.MEDIUM, CaseSeverity.CRITICAL];
      expect(constructQueryOptions({ severity }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.severity",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "10",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.severity",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "30",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('creates a filter for the time range', () => {
      expect(constructQueryOptions({ from: 'now-1M', to: 'now' }).filter).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "gte",
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "now-1M",
                },
              ],
              "function": "range",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "cases.attributes.created_at",
                },
                "lte",
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "now",
                },
              ],
              "function": "range",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    it('sets filter to undefined when no options were passed', () => {
      expect(constructQueryOptions({}).filter).toBeUndefined();
    });

    it('creates a filter with tags and reporters', () => {
      expect(constructQueryOptions({ tags: ['tag1', 'tag2'], reporters: 'sam' }).filter)
        .toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "tag1",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.tags",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "tag2",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases.attributes.created_by.profile_uid",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "sam",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    describe('customFields', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'Text field',
          required: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'Toggle field',
          required: true,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'another toggle field',
          required: false,
        },
      ];

      it('creates a filter with toggle customField', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { second_key: [true] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );

        expect(kqlFilter).toMatchInlineSnapshot(
          `"cases.attributes.customFields: { (key: second_key AND value.boolean: true) }"`
        );
      });

      it('creates a filter with text customField', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { first_key: ['hello'] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );

        expect(kqlFilter).toMatchInlineSnapshot(
          `"cases.attributes.customFields: { (key: first_key AND value.text: hello) }"`
        );
      });

      it('creates a filter with null customField value', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { first_key: [null] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );

        expect(kqlFilter).toMatchInlineSnapshot(
          `"cases.attributes.customFields: { (key: first_key AND NOT value: *) }"`
        );
      });

      it('creates a filter with multiple customFields', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { second_key: [true], third_key: [false] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );
        expect(kqlFilter).toMatchInlineSnapshot(
          `"(cases.attributes.customFields: { (key: second_key AND value.boolean: true) } AND cases.attributes.customFields: { (key: third_key AND value.boolean: false) })"`
        );
      });

      it('creates a filter with multiple customFields values', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { second_key: [true, null], third_key: [false] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );

        expect(kqlFilter).toMatchInlineSnapshot(
          `"((cases.attributes.customFields: { (key: second_key AND value.boolean: true) } OR cases.attributes.customFields: { (key: second_key AND NOT value: *) }) AND cases.attributes.customFields: { (key: third_key AND value.boolean: false) })"`
        );
      });

      it('creates a filter with only key when value is empty', () => {
        const kqlFilter = toKqlExpression(
          constructQueryOptions({
            customFields: { second_key: [], third_key: [] },
            customFieldsConfiguration,
          }).filter as KueryNode
        );

        expect(kqlFilter).toMatchInlineSnapshot(
          `"(cases.attributes.customFields: { key: second_key } AND cases.attributes.customFields: { key: third_key })"`
        );
      });

      it('does not create a filter when customFields is undefined', () => {
        expect(
          constructQueryOptions({
            customFields: undefined,
            customFieldsConfiguration,
          }).filter
        ).toBeUndefined();
      });

      it('does not create a filter when customFieldsConfiguration is undefined', () => {
        expect(
          constructQueryOptions({
            customFields: { second_key: [true] },
            customFieldsConfiguration: undefined,
          }).filter
        ).toBeUndefined();
      });

      it('does not create a filter when customFieldsConfiguration is empty', () => {
        expect(
          constructQueryOptions({
            customFields: { second_key: [true] },
            customFieldsConfiguration: [],
          }).filter
        ).toBeUndefined();
      });

      it('does not create a filter when customFields key does not match with any key of customFieldsConfiguration', () => {
        expect(
          constructQueryOptions({
            customFields: { random_key: [true] },
            customFieldsConfiguration,
          }).filter
        ).toBeUndefined();
      });

      it('does not create a filter when no customFields mapping found', () => {
        const newCustomFieldsConfiguration = [
          ...customFieldsConfiguration,
          {
            key: 'fourth_key',
            type: 'symbol',
            label: 'Number field',
            required: true,
          },
        ];

        expect(
          constructQueryOptions({
            customFields: { fourth_key: [1] },
            // @ts-expect-error: need to create a mapping check
            customFieldsConfiguration: newCustomFieldsConfiguration,
          }).filter
        ).toBeUndefined();
      });
    });
  });

  describe('arraysDifference', () => {
    it('returns null if originalValue is null', () => {
      expect(arraysDifference(null, [])).toBeNull();
    });

    it('returns null if originalValue is undefined', () => {
      expect(arraysDifference(undefined, [])).toBeNull();
    });

    it('returns null if originalValue is not an array', () => {
      // @ts-expect-error passing a string instead of an array
      expect(arraysDifference('a string', [])).toBeNull();
    });

    it('returns null if updatedValue is null', () => {
      expect(arraysDifference([], null)).toBeNull();
    });

    it('returns null if updatedValue is undefined', () => {
      expect(arraysDifference([], undefined)).toBeNull();
    });

    it('returns null if updatedValue is not an array', () => {
      expect(arraysDifference([], 'a string' as unknown as string[])).toBeNull();
    });

    it('returns null if the arrays are both empty', () => {
      expect(arraysDifference([], [])).toBeNull();
    });

    describe('object arrays', () => {
      it('returns null if the arrays are both equal with single string', () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a' }])).toBeNull();
      });

      it('returns null if the arrays are both equal with multiple strings', () => {
        expect(
          arraysDifference([{ uid: 'a' }, { uid: 'b' }], [{ uid: 'a' }, { uid: 'b' }])
        ).toBeNull();
      });

      it("returns 'b' in the added items when the updated value contains an added value", () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a' }, { uid: 'b' }]))
          .toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "uid": "b",
              },
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'b' in the deleted items when the updated value removes an item", () => {
        expect(arraysDifference([{ uid: 'a' }, { uid: 'b' }], [{ uid: 'a' }]))
          .toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              Object {
                "uid": "b",
              },
            ],
          }
        `);
      });

      it("returns 'a' and 'b' in the added items when the updated value adds both", () => {
        expect(arraysDifference([], [{ uid: 'a' }, { uid: 'b' }])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "uid": "a",
              },
              Object {
                "uid": "b",
              },
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'a' and 'b' in the deleted items when the updated value removes both", () => {
        expect(arraysDifference([{ uid: 'a' }, { uid: 'b' }], [])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              Object {
                "uid": "a",
              },
              Object {
                "uid": "b",
              },
            ],
          }
        `);
      });

      it('returns the added and deleted values if the type of objects are different', () => {
        expect(arraysDifference([{ uid: 'a' }], [{ uid: 'a', hi: '1' }])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              Object {
                "hi": "1",
                "uid": "a",
              },
            ],
            "deletedItems": Array [
              Object {
                "uid": "a",
              },
            ],
          }
        `);
      });
    });

    describe('string arrays', () => {
      it('returns null if the arrays are both equal with single string', () => {
        expect(arraysDifference(['a'], ['a'])).toBeNull();
      });

      it('returns null if the arrays are both equal with multiple strings', () => {
        expect(arraysDifference(['a', 'b'], ['a', 'b'])).toBeNull();
      });

      it("returns 'b' in the added items when the updated value contains an added value", () => {
        expect(arraysDifference(['a'], ['a', 'b'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              "b",
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'b' in the deleted items when the updated value removes an item", () => {
        expect(arraysDifference(['a', 'b'], ['a'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              "b",
            ],
          }
        `);
      });

      it("returns 'a' and 'b' in the added items when the updated value adds both", () => {
        expect(arraysDifference([], ['a', 'b'])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [
              "a",
              "b",
            ],
            "deletedItems": Array [],
          }
        `);
      });

      it("returns 'a' and 'b' in the deleted items when the updated value removes both", () => {
        expect(arraysDifference(['a', 'b'], [])).toMatchInlineSnapshot(`
          Object {
            "addedItems": Array [],
            "deletedItems": Array [
              "a",
              "b",
            ],
          }
        `);
      });
    });
  });

  describe('constructSearchById', () => {
    const savedObjectsSerializer = createSavedObjectsSerializerMock();

    it('returns the rootSearchFields and search with correct values when given a uuid', () => {
      const uuid = uuidv1(); // the specific version is irrelevant

      expect(constructSearch(uuid, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer))
        .toMatchInlineSnapshot(`
        Object {
          "rootSearchFields": Array [
            "_id",
          ],
          "search": "\\"`);
    });

    it('search value not changed and no rootSearchFields when search is non-uuid', () => {
      const search = 'foobar';
      const result = constructSearch(search, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer);

      expect(result).not.toHaveProperty('rootSearchFields');
      expect(result).toEqual({ search });
    });

    it('returns undefined if search term undefined', () => {
      expect(constructSearch(undefined, DEFAULT_NAMESPACE_STRING, savedObjectsSerializer)).toEqual(
        undefined
      );
    });
  });

  describe('transformTemplateCustomFields', () => {
    const customFields = [
      {
        type: CustomFieldTypes.TEXT as const,
        key: 'test_key_1',
        label: 'My test label 1',
        required: true,
        defaultValue: 'My default value',
      },
      {
        type: CustomFieldTypes.TOGGLE as const,
        key: 'test_key_2',
        label: 'My test label 2',
        required: true,
        defaultValue: true,
      },
      {
        type: CustomFieldTypes.TEXT as const,
        key: 'test_key_3',
        label: 'My test label 3',
        required: false,
      },
    ];

    const templates = [
      {
        key: 'test_template_1',
        name: 'First test template',
        description: 'This is a first test template',
        caseFields: {
          customFields: [
            {
              type: CustomFieldTypes.TEXT as const,
              key: 'test_key_1',
              value: 'My default value',
            },
            {
              type: CustomFieldTypes.TOGGLE as const,
              key: 'test_key_2',
              value: false,
            },
            {
              type: CustomFieldTypes.TEXT as const,
              key: 'test_key_3',
              value: 'Test custom field',
            },
          ],
        },
      },
      {
        key: 'test_template_2',
        name: 'Second test template',
        description: 'This is a second test template',
        tags: [],
        caseFields: {
          customFields: [
            {
              type: CustomFieldTypes.TEXT as const,
              key: 'test_key_1',
              value: 'My value',
            },
            {
              type: CustomFieldTypes.TOGGLE as const,
              key: 'test_key_2',
              value: true,
            },
          ],
        },
      },
    ];

    it('removes custom field from template correctly', () => {
      const res = transformTemplateCustomFields({
        templates,
        customFields: [customFields[0], customFields[1]],
      });

      expect(res).toEqual([
        {
          caseFields: {
            customFields: [
              {
                key: 'test_key_1',
                type: 'text',
                value: 'My default value',
              },
              {
                key: 'test_key_2',
                type: 'toggle',
                value: false,
              },
            ],
          },
          description: 'This is a first test template',
          key: 'test_template_1',
          name: 'First test template',
        },
        {
          description: 'This is a second test template',
          key: 'test_template_2',
          name: 'Second test template',
          tags: [],
          caseFields: {
            customFields: [
              {
                key: 'test_key_1',
                type: 'text',
                value: 'My value',
              },
              {
                key: 'test_key_2',
                type: 'toggle',
                value: true,
              },
            ],
          },
        },
      ]);
    });

    it('removes multiple custom fields from template correctly', () => {
      const res = transformTemplateCustomFields({
        templates,
        customFields: [customFields[0]],
      });

      expect(res).toEqual([
        {
          caseFields: {
            customFields: [
              {
                key: 'test_key_1',
                type: 'text',
                value: 'My default value',
              },
            ],
          },
          description: 'This is a first test template',
          key: 'test_template_1',
          name: 'First test template',
        },
        {
          description: 'This is a second test template',
          key: 'test_template_2',
          name: 'Second test template',
          tags: [],
          caseFields: {
            customFields: [
              {
                key: 'test_key_1',
                type: 'text',
                value: 'My value',
              },
            ],
          },
        },
      ]);
    });

    it('removes all custom fields from templates when custom fields are empty', () => {
      const res = transformTemplateCustomFields({
        templates,
        customFields: [],
      });

      expect(res).toEqual([
        {
          caseFields: {
            customFields: [],
          },
          description: 'This is a first test template',
          key: 'test_template_1',
          name: 'First test template',
        },
        {
          description: 'This is a second test template',
          key: 'test_template_2',
          name: 'Second test template',
          tags: [],
          caseFields: {
            customFields: [],
          },
        },
      ]);
    });

    it('removes all custom fields from templates when custom fields are undefined', () => {
      const res = transformTemplateCustomFields({
        templates,
        customFields: undefined,
      });

      expect(res).toEqual([
        { ...templates[0], caseFields: { customFields: [] } },
        { ...templates[1], caseFields: { ...templates[1].caseFields, customFields: [] } },
      ]);
    });

    it('adds custom fields to templates when templates do not have custom fields', () => {
      const res = transformTemplateCustomFields({
        templates: [
          {
            key: 'test_template_1',
            name: 'First test template',
            description: 'This is a first test template',
            caseFields: null,
          },
          {
            key: 'test_template_2',
            name: 'Second test template',
            caseFields: {
              title: 'Test title',
              description: 'this is test',
            },
          },
        ],
        customFields: [customFields[0], customFields[1]],
      });

      expect(res).toEqual([
        {
          caseFields: {
            customFields: [
              {
                key: customFields[0].key,
                type: customFields[0].type,
                value: customFields[0].defaultValue,
              },
              {
                key: customFields[1].key,
                type: customFields[1].type,
                value: customFields[1].defaultValue,
              },
            ],
          },
          description: 'This is a first test template',
          key: 'test_template_1',
          name: 'First test template',
        },
        {
          key: 'test_template_2',
          name: 'Second test template',
          caseFields: {
            description: 'this is test',
            title: 'Test title',
            customFields: [
              {
                key: customFields[0].key,
                type: customFields[0].type,
                value: customFields[0].defaultValue,
              },
              {
                key: customFields[1].key,
                type: customFields[1].type,
                value: customFields[1].defaultValue,
              },
            ],
          },
        },
      ]);
    });

    it('adds custom fields to templates when template custom fields are empty', () => {
      const res = transformTemplateCustomFields({
        templates: [
          {
            key: 'test_template_2',
            name: 'Second test template',
            caseFields: {
              title: 'Test title',
              description: 'this is test',
              customFields: [],
            },
          },
        ],
        customFields: [customFields[0], customFields[1], customFields[2]],
      });

      expect(res).toEqual([
        {
          key: 'test_template_2',
          name: 'Second test template',
          caseFields: {
            title: 'Test title',
            description: 'this is test',
            customFields: [
              {
                key: customFields[0].key,
                type: customFields[0].type,
                value: customFields[0].defaultValue,
              },
              {
                key: customFields[1].key,
                type: customFields[1].type,
                value: customFields[1].defaultValue,
              },
              {
                key: customFields[2].key,
                type: customFields[2].type,
                value: null,
              },
            ],
          },
        },
      ]);
    });

    it('adds custom fields to templates with correct values', () => {
      const res = transformTemplateCustomFields({
        templates: [
          {
            key: 'test_template_2',
            name: 'Second test template',
            caseFields: {
              title: 'Test title',
              description: 'this is test',
              customFields: [],
            },
          },
        ],
        customFields: [
          ...customFields,
          {
            type: CustomFieldTypes.TOGGLE as const,
            key: 'test_key_4',
            label: 'My test label 4',
            required: true,
          },
        ],
      });

      expect(res).toEqual([
        {
          key: 'test_template_2',
          name: 'Second test template',
          caseFields: {
            title: 'Test title',
            description: 'this is test',
            customFields: [
              {
                key: customFields[0].key,
                type: customFields[0].type,
                value: customFields[0].defaultValue,
              },
              {
                key: customFields[1].key,
                type: customFields[1].type,
                value: customFields[1].defaultValue,
              },
              {
                key: customFields[2].key,
                type: customFields[2].type,
                value: null,
              },
              {
                type: CustomFieldTypes.TOGGLE as const,
                key: 'test_key_4',
                value: false,
              },
            ],
          },
        },
      ]);
    });

    it('does not change the existing template custom field', () => {
      const res = transformTemplateCustomFields({
        templates: [
          {
            key: 'test_template_2',
            name: 'Second test template',
            caseFields: {
              title: 'Test title',
              description: 'this is test',
              customFields: [
                {
                  key: customFields[0].key,
                  type: CustomFieldTypes.TEXT as const,
                  value: 'updated text value',
                },
                {
                  key: customFields[1].key,
                  type: CustomFieldTypes.TOGGLE as const,
                  value: false,
                },
                {
                  key: customFields[2].key,
                  type: customFields[2].type,
                  value: null,
                },
              ],
            },
          },
        ],
        customFields,
      });

      expect(res).toEqual([
        {
          key: 'test_template_2',
          name: 'Second test template',
          caseFields: {
            title: 'Test title',
            description: 'this is test',
            customFields: [
              {
                key: customFields[0].key,
                type: customFields[0].type,
                value: 'updated text value',
              },
              {
                key: customFields[1].key,
                type: customFields[1].type,
                value: false,
              },
              {
                key: customFields[2].key,
                type: customFields[2].type,
                value: null,
              },
            ],
          },
        },
      ]);
    });

    it('does not remove custom field from empty templates', () => {
      const res = transformTemplateCustomFields({
        templates: [],
        customFields: [customFields[0], customFields[1]],
      });

      expect(res).toEqual([]);
    });

    it('returns empty array when templates are undefined', () => {
      const res = transformTemplateCustomFields({
        templates: undefined,
        customFields: [customFields[0], customFields[1]],
      });

      expect(res).toEqual([]);
    });
  });

  describe('buildAttachmentRequestFromFileJSON', () => {
    it('builds attachment request correctly', () => {
      expect(
        buildAttachmentRequestFromFileJSON({
          owner: 'theOwner',
          fileMetadata: {
            id: 'file-id',
            created: 'created',
            extension: 'jpg',
            mimeType: 'image/jpeg',
            name: 'foobar',
          } as FileJSON,
        })
      ).toStrictEqual({
        externalReferenceAttachmentTypeId: '.files',
        externalReferenceId: 'file-id',
        externalReferenceMetadata: {
          files: [
            {
              created: 'created',
              extension: 'jpg',
              mimeType: 'image/jpeg',
              name: 'foobar',
            },
          ],
        },
        externalReferenceStorage: {
          soType: 'file',
          type: 'savedObject',
        },
        owner: 'theOwner',
        type: 'externalReference',
      });
    });
  });
});
