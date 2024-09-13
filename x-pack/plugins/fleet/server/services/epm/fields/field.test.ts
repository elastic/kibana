/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

import globby from 'globby';
import { safeLoad } from 'js-yaml';

import { getField, processFields, processFieldsWithWildcard } from './field';
import type { Field, Fields } from './field';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

test('tests loading fields.yml', () => {
  // Find all .yml files to run tests on
  const files = globby.sync(path.join(__dirname, '/tests/*.yml'));
  for (const file of files) {
    const fieldsYML = readFileSync(file, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);
    const processedFields = processFields(fields);

    // Check that content file and generated file are equal
    expect(processedFields).toMatchSnapshot(path.basename(file));
  }
});

describe('getField searches recursively for nested field in fields given an array of path parts', () => {
  const searchFields: Fields = [
    {
      name: '1',
      fields: [
        {
          name: '1-1',
        },
        {
          name: '1-2',
        },
      ],
    },
    {
      name: '2',
      fields: [
        {
          name: '2-1',
        },
        {
          name: '2-2',
          fields: [
            {
              name: '2-2-1',
            },
            {
              name: '2-2-2',
            },
          ],
        },
      ],
    },
  ];
  test('returns undefined when the field does not exist', () => {
    expect(getField(searchFields, ['0'])).toBe(undefined);
  });
  test('returns undefined if the field is not a leaf node', () => {
    expect(getField(searchFields, ['1'])?.name).toBe(undefined);
  });
  test('returns undefined searching for a nested field that does not exist', () => {
    expect(getField(searchFields, ['1', '1-3'])?.name).toBe(undefined);
  });
  test('returns nested field that is a leaf node', () => {
    expect(getField(searchFields, ['2', '2-2', '2-2-1'])?.name).toBe('2-2-1');
  });
});

describe('processFields', () => {
  const flattenedFields = [
    {
      name: 'a.a',
      type: 'text',
    },
    {
      name: 'a.b',
      type: 'text',
    },
  ];
  const expandedFields = [
    {
      name: 'a',
      type: 'group',
      fields: [
        {
          name: 'a',
          type: 'text',
        },
        {
          name: 'b',
          type: 'text',
        },
      ],
    },
  ];
  test('correctly expands flattened fields', () => {
    expect(JSON.stringify(processFields(flattenedFields))).toEqual(JSON.stringify(expandedFields));
  });
  test('leaves expanded fields unchanged', () => {
    expect(JSON.stringify(processFields(expandedFields))).toEqual(JSON.stringify(expandedFields));
  });

  const mixedFieldsA = [
    {
      name: 'a.a',
      type: 'group',
      fields: [
        {
          name: 'a',
          type: 'text',
        },
        {
          name: 'b',
          type: 'text',
        },
      ],
    },
  ];

  const mixedFieldsB = [
    {
      name: 'a',
      type: 'group',
      fields: [
        {
          name: 'a.a',
          type: 'text',
        },
        {
          name: 'a.b',
          type: 'text',
        },
      ],
    },
  ];

  const mixedFieldsExpanded = [
    {
      name: 'a',
      type: 'group',
      fields: [
        {
          name: 'a',
          type: 'group',
          fields: [
            {
              name: 'a',
              type: 'text',
            },
            {
              name: 'b',
              type: 'text',
            },
          ],
        },
      ],
    },
  ];
  test('correctly expands a mix of expanded and flattened fields', () => {
    expect(JSON.stringify(processFields(mixedFieldsA))).toEqual(
      JSON.stringify(mixedFieldsExpanded)
    );
    expect(JSON.stringify(processFields(mixedFieldsB))).toEqual(
      JSON.stringify(mixedFieldsExpanded)
    );
  });

  const objectFieldWithProperty = [
    {
      name: 'a',
      type: 'object',
      dynamic: true,
    },
    {
      name: 'a.b',
      type: 'keyword',
    },
  ];

  const objectFieldWithPropertyExpanded = [
    {
      name: 'a',
      type: 'group',
      dynamic: true,
      fields: [
        {
          name: 'b',
          type: 'keyword',
        },
      ],
    },
  ];
  test('correctly handles properties of object type fields', () => {
    expect(JSON.stringify(processFields(objectFieldWithProperty))).toEqual(
      JSON.stringify(objectFieldWithPropertyExpanded)
    );
  });

  test('correctly handles properties of object type fields where object comes second', () => {
    const nested = [
      {
        name: 'a.b',
        type: 'keyword',
      },
      {
        name: 'a',
        type: 'object',
        dynamic: true,
      },
    ];

    const nestedExpanded = [
      {
        name: 'a',
        type: 'group',
        dynamic: true,
        fields: [
          {
            name: 'b',
            type: 'keyword',
          },
        ],
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpanded);
  });

  test('correctly handles properties of nested type fields', () => {
    const nested = [
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
      },
      {
        name: 'a.b',
        type: 'keyword',
      },
    ];

    const nestedExpanded = [
      {
        name: 'a',
        type: 'group-nested',
        dynamic: true,
        fields: [
          {
            name: 'b',
            type: 'keyword',
          },
        ],
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpanded);
  });

  test('correctly handles properties of nested type fields with subfields', () => {
    const nested = [
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
        fields: [
          {
            name: 'b',
            type: 'keyword',
          },
        ],
      },
    ];

    const nestedExpanded = [
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
        fields: [
          {
            name: 'b',
            type: 'keyword',
          },
        ],
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpanded);
  });

  test('correctly handles properties of nested and object type fields together', () => {
    const fields = [
      {
        name: 'a',
        type: 'object',
      },
      {
        name: 'a.b',
        type: 'nested',
      },
      {
        name: 'a.b.c',
        type: 'boolean',
      },
      {
        name: 'a.b.d',
        type: 'keyword',
      },
    ];

    const fieldsExpanded = [
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'group-nested',
            fields: [
              {
                name: 'c',
                type: 'boolean',
              },
              {
                name: 'd',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ];
    expect(processFields(fields)).toEqual(fieldsExpanded);
  });

  test('correctly handles properties of nested and object type fields in large depth', () => {
    const fields = [
      {
        name: 'a.h-object',
        type: 'object',
        dynamic: false,
      },
      {
        name: 'a.b-nested.c-nested',
        type: 'nested',
      },
      {
        name: 'a.b-nested',
        type: 'nested',
      },
      {
        name: 'a',
        type: 'object',
      },
      {
        name: 'a.b-nested.d',
        type: 'keyword',
      },
      {
        name: 'a.b-nested.c-nested.e',
        type: 'boolean',
        dynamic: true,
      },
      {
        name: 'a.b-nested.c-nested.f-object',
        type: 'object',
      },
      {
        name: 'a.b-nested.c-nested.f-object.g',
        type: 'keyword',
      },
    ];

    const fieldsExpanded = [
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'h-object',
            type: 'object',
            dynamic: false,
          },
          {
            name: 'b-nested',
            type: 'group-nested',
            fields: [
              {
                name: 'c-nested',
                type: 'group-nested',
                fields: [
                  {
                    name: 'e',
                    type: 'boolean',
                    dynamic: true,
                  },
                  {
                    name: 'f-object',
                    type: 'group',
                    fields: [
                      {
                        name: 'g',
                        type: 'keyword',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'd',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ];
    expect(processFields(fields)).toEqual(fieldsExpanded);
  });

  test('correctly handles properties of nested and object type fields together in different order', () => {
    const fields = [
      {
        name: 'a.b.c',
        type: 'boolean',
      },
      {
        name: 'a.b',
        type: 'nested',
      },
      {
        name: 'a',
        type: 'object',
      },
      {
        name: 'a.b.d',
        type: 'keyword',
      },
    ];

    const fieldsExpanded = [
      {
        name: 'a',
        type: 'group',
        fields: [
          {
            name: 'b',
            type: 'group-nested',
            fields: [
              {
                name: 'c',
                type: 'boolean',
              },
              {
                name: 'd',
                type: 'keyword',
              },
            ],
          },
        ],
      },
    ];
    expect(processFields(fields)).toEqual(fieldsExpanded);
  });

  test('correctly handles properties of nested type where nested top level comes second', () => {
    const nested = [
      {
        name: 'a.b',
        type: 'keyword',
      },
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
      },
    ];

    const nestedExpanded = [
      {
        name: 'a',
        type: 'group-nested',
        dynamic: true,
        fields: [
          {
            name: 'b',
            type: 'keyword',
          },
        ],
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpanded);
  });

  test('ignores redefinitions of an object field', () => {
    const object = [
      {
        name: 'a',
        type: 'object',
        dynamic: true,
      },
      {
        name: 'a',
        type: 'object',
        dynamic: false,
      },
    ];

    const objectExpected = [
      {
        name: 'a',
        type: 'object',
        // should preserve the field that was parsed first which had dynamic: true
        dynamic: true,
      },
    ];
    expect(processFields(object)).toEqual(objectExpected);
  });

  test('ignores redefinitions of a nested field', () => {
    const nested = [
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
      },
      {
        name: 'a',
        type: 'nested',
        dynamic: false,
      },
    ];

    const nestedExpected = [
      {
        name: 'a',
        type: 'nested',
        // should preserve the field that was parsed first which had dynamic: true
        dynamic: true,
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpected);
  });

  test('ignores redefinitions of a nested and object field', () => {
    const nested = [
      {
        name: 'a',
        type: 'nested',
        dynamic: true,
      },
      {
        name: 'a',
        type: 'object',
        dynamic: false,
      },
    ];

    const nestedExpected = [
      {
        name: 'a',
        type: 'nested',
        // should preserve the field that was parsed first which had dynamic: true
        dynamic: true,
      },
    ];
    expect(processFields(nested)).toEqual(nestedExpected);
  });

  test('ignores redefinitions of a field', () => {
    const fields = [
      {
        name: 'a',
        type: 'text',
      },
      {
        name: 'a',
        type: 'number',
      },
      {
        name: 'b.c',
        type: 'number',
      },
      {
        name: 'b',
        type: 'group',
        fields: [
          {
            name: 'c',
            type: 'text',
          },
        ],
      },
    ];

    const fieldsExpected = [
      {
        name: 'a',
        // should preserve the field that was parsed first which had type: text
        type: 'text',
      },
      {
        name: 'b',
        type: 'group',
        fields: [
          {
            name: 'c',
            // should preserve the field that was parsed first which had type: number
            type: 'number',
          },
        ],
      },
    ];
    expect(processFields(fields)).toEqual(fieldsExpected);
  });

  test('ignores multiple redefinitions of a field', () => {
    const fields = [
      {
        name: 'a',
        type: 'text',
      },
      {
        name: 'a',
        type: 'number',
      },
      {
        name: 'a',
        type: 'keyword',
      },
    ];

    const fieldsExpected = [
      {
        name: 'a',
        // should preserve the field that was parsed first which had type: text
        type: 'text',
      },
    ];
    expect(processFields(fields)).toEqual(fieldsExpected);
  });

  test('handle wildcard field', () => {
    const wildcardFields = [
      {
        name: 'a.*.b',
        type: 'keyword',
      },
      {
        name: 'a.b.*',
        type: 'scaled_float',
      },
    ];

    expect(processFields(wildcardFields)).toMatchInlineSnapshot(`
      [
        {
          "name": "a",
          "type": "group",
          "fields": [
            {
              "name": "*",
              "type": "group",
              "fields": [
                {
                  "name": "b",
                  "type": "object",
                  "object_type": "keyword"
                }
              ]
            },
            {
              "name": "b",
              "type": "group",
              "fields": [
                {
                  "name": "*",
                  "type": "object",
                  "object_type": "scaled_float"
                }
              ]
            }
          ]
        }
      ]
    `);
  });

  test('handle wildcard field inside group', () => {
    const wildcardFields = [
      {
        name: 'prometheus',
        type: 'group',
        fields: [
          {
            name: 'metrics.*',
            type: 'double',
            metric_type: 'gauge',
          },
          {
            name: 'child_group',
            type: 'group',
            fields: [
              {
                name: 'child.*',
                type: 'double',
                metric_type: 'gauge',
              },
            ],
          },
        ],
      },
    ];

    expect(processFieldsWithWildcard(wildcardFields)).toEqual([
      {
        name: 'prometheus',
        type: 'group',
        fields: [
          {
            name: 'metrics.*',
            type: 'object',
            object_type: 'double',
            metric_type: 'gauge',
          },
          {
            name: 'child_group',
            type: 'group',
            fields: [
              {
                name: 'child.*',
                type: 'object',
                object_type: 'double',
                metric_type: 'gauge',
              },
            ],
          },
        ],
      },
    ]);
  });

  describe('processFieldsWithWildcard', () => {
    const wildcardWithObjectTypeYml = `
    - name: a.*.b
      type: long
      format: bytes
      unit: byte
      object_type: scaled_float
      metric_type: gauge
      description: |
        Total swap memory.
`;

    const noWildcardYml = `
    - name: test
      type: long
      format: bytes
      unit: byte
      metric_type: gauge
      description: |
        Total swap memory.
`;

    const noWildcardFields: Field[] = safeLoad(noWildcardYml);
    const wildcardWithObjectTypeFields: Field[] = safeLoad(wildcardWithObjectTypeYml);

    test('Does not add object type when object_type field when is already defined and name has wildcard', () => {
      expect(processFieldsWithWildcard(wildcardWithObjectTypeFields)).toMatchInlineSnapshot(`
        [
          {
            "name": "a.*.b",
            "type": "long",
            "format": "bytes",
            "unit": "byte",
            "object_type": "scaled_float",
            "metric_type": "gauge",
            "description": "Total swap memory.\\n"
          }
        ]
      `);
    });

    test('Returns input fields when name has no wildcard', () => {
      expect(processFieldsWithWildcard(noWildcardFields)).toMatchInlineSnapshot(`
        [
          {
            "name": "test",
            "type": "long",
            "format": "bytes",
            "unit": "byte",
            "metric_type": "gauge",
            "description": "Total swap memory.\\n"
          }
        ]
      `);
    });
  });
});
