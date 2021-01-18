/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { readFileSync } from 'fs';
import glob from 'glob';
import { safeLoad } from 'js-yaml';
import {
  flattenFields,
  dedupeFields,
  transformField,
  findFieldByPath,
  IndexPatternField,
  createFieldFormatMap,
  createIndexPatternFields,
  createIndexPattern,
} from './install';
import { Fields, Field } from '../../fields/field';
import { dupeFields } from './tests/test_data';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});
const files = glob.sync(path.join(__dirname, '/tests/*.yml'));
let fields: Fields = [];
for (const file of files) {
  const fieldsYML = readFileSync(file, 'utf-8');
  fields = fields.concat(safeLoad(fieldsYML));
}

describe('creating index patterns from yaml fields', () => {
  interface Test {
    fields: Field[];
    expect: string | number | boolean | undefined;
  }

  const name = 'testField';

  test('createIndexPatternFields function creates Kibana index pattern fields and fieldFormatMap', () => {
    const indexPatternFields = createIndexPatternFields(fields);
    expect(indexPatternFields).toMatchSnapshot('createIndexPatternFields');
  });

  test('createIndexPattern function creates Kibana index pattern', () => {
    const indexPattern = createIndexPattern('logs', fields);
    expect(indexPattern).toMatchSnapshot('createIndexPattern');
  });

  describe('flattenFields function flattens recursively and handles copying alias fields', () => {
    test('a field of type group with no nested fields is skipped', () => {
      const flattened = flattenFields([{ name: 'nginx', type: 'group' }]);
      expect(flattened.length).toBe(0);
    });
    test('flattenFields matches snapshot', () => {
      const flattened = flattenFields(fields);
      expect(flattened).toMatchSnapshot('flattenFields');
    });
  });

  describe('dedupFields', () => {
    const deduped = dedupeFields(dupeFields);
    const checkIfDup = (field: Field) => {
      return deduped.filter((item) => item.name === field.name);
    };
    test('there there is one field object with name of "1"', () => {
      expect(checkIfDup({ name: '1' }).length).toBe(1);
    });
    test('there there is one field object with name of "1.1"', () => {
      expect(checkIfDup({ name: '1.1' }).length).toBe(1);
    });
    test('there there is one field object with name of "2"', () => {
      expect(checkIfDup({ name: '2' }).length).toBe(1);
    });
    test('there there is one field object with name of "4"', () => {
      expect(checkIfDup({ name: '4' }).length).toBe(1);
    });
    // existing field takes precendence
    test('the new merged field has correct attributes', () => {
      const mergedField = deduped.find((field) => field.name === '1');
      expect(mergedField?.searchable).toBe(true);
      expect(mergedField?.aggregatable).toBe(true);
      expect(mergedField?.analyzed).toBe(true);
      expect(mergedField?.count).toBe(0);
    });
  });

  describe('getFieldByPath searches recursively for field in fields given dot separated path', () => {
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
      expect(findFieldByPath(searchFields, '0')).toBe(undefined);
    });
    test('returns undefined if the field is not a leaf node', () => {
      expect(findFieldByPath(searchFields, '1')?.name).toBe(undefined);
    });
    test('returns undefined searching for a nested field that does not exist', () => {
      expect(findFieldByPath(searchFields, '1.1-3')?.name).toBe(undefined);
    });
    test('returns nested field that is a leaf node', () => {
      expect(findFieldByPath(searchFields, '2.2-2.2-2-1')?.name).toBe('2-2-1');
    });
  });

  test('transformField maps field types to kibana index pattern data types', () => {
    const tests: Test[] = [
      { fields: [{ name: 'testField' }], expect: 'string' },
      { fields: [{ name: 'testField', type: 'half_float' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'scaled_float' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'float' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'integer' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'long' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'short' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'byte' }], expect: 'number' },
      { fields: [{ name: 'testField', type: 'keyword' }], expect: 'string' },
      { fields: [{ name: 'testField', type: 'invalidType' }], expect: undefined },
      { fields: [{ name: 'testField', type: 'text' }], expect: 'string' },
      { fields: [{ name: 'testField', type: 'date' }], expect: 'date' },
      { fields: [{ name: 'testField', type: 'geo_point' }], expect: 'geo_point' },
      { fields: [{ name: 'testField', type: 'constant_keyword' }], expect: 'string' },
    ];

    tests.forEach((test) => {
      const res = test.fields.map(transformField);
      expect(res[0].type).toBe(test.expect);
    });
  });

  test('transformField changes values based on other values', () => {
    interface TestWithAttr extends Test {
      attr: keyof IndexPatternField;
    }

    const tests: TestWithAttr[] = [
      // count
      { fields: [{ name }], expect: 0, attr: 'count' },
      { fields: [{ name, count: 4 }], expect: 4, attr: 'count' },

      // searchable
      { fields: [{ name }], expect: true, attr: 'searchable' },
      { fields: [{ name, searchable: true }], expect: true, attr: 'searchable' },
      { fields: [{ name, searchable: false }], expect: false, attr: 'searchable' },
      { fields: [{ name, type: 'binary' }], expect: false, attr: 'searchable' },
      { fields: [{ name, searchable: true, type: 'binary' }], expect: false, attr: 'searchable' },
      {
        fields: [{ name, searchable: true, type: 'object', enabled: false }],
        expect: false,
        attr: 'searchable',
      },

      // aggregatable
      { fields: [{ name }], expect: true, attr: 'aggregatable' },
      { fields: [{ name, aggregatable: true }], expect: true, attr: 'aggregatable' },
      { fields: [{ name, aggregatable: false }], expect: false, attr: 'aggregatable' },
      { fields: [{ name, type: 'binary' }], expect: false, attr: 'aggregatable' },
      {
        fields: [{ name, aggregatable: true, type: 'binary' }],
        expect: false,
        attr: 'aggregatable',
      },
      { fields: [{ name, type: 'keyword' }], expect: true, attr: 'aggregatable' },
      { fields: [{ name, type: 'constant_keyword' }], expect: true, attr: 'aggregatable' },
      { fields: [{ name, type: 'text', aggregatable: true }], expect: false, attr: 'aggregatable' },
      { fields: [{ name, type: 'text' }], expect: false, attr: 'aggregatable' },
      {
        fields: [{ name, aggregatable: true, type: 'object', enabled: false }],
        expect: false,
        attr: 'aggregatable',
      },

      // analyzed
      { fields: [{ name }], expect: false, attr: 'analyzed' },
      { fields: [{ name, analyzed: true }], expect: true, attr: 'analyzed' },
      { fields: [{ name, analyzed: false }], expect: false, attr: 'analyzed' },
      { fields: [{ name, type: 'binary' }], expect: false, attr: 'analyzed' },
      { fields: [{ name, analyzed: true, type: 'binary' }], expect: false, attr: 'analyzed' },
      {
        fields: [{ name, analyzed: true, type: 'object', enabled: false }],
        expect: false,
        attr: 'analyzed',
      },

      // doc_values always set to true except for meta fields
      { fields: [{ name }], expect: true, attr: 'doc_values' },
      { fields: [{ name, doc_values: true }], expect: true, attr: 'doc_values' },
      { fields: [{ name, doc_values: false }], expect: false, attr: 'doc_values' },
      { fields: [{ name, script: 'doc[]' }], expect: false, attr: 'doc_values' },
      { fields: [{ name, doc_values: true, script: 'doc[]' }], expect: false, attr: 'doc_values' },
      { fields: [{ name, type: 'binary' }], expect: false, attr: 'doc_values' },
      { fields: [{ name, doc_values: true, type: 'binary' }], expect: true, attr: 'doc_values' },
      {
        fields: [{ name, doc_values: true, type: 'object', enabled: false }],
        expect: false,
        attr: 'doc_values',
      },

      // enabled - only applies to objects (and only if set)
      { fields: [{ name, type: 'binary', enabled: false }], expect: undefined, attr: 'enabled' },
      { fields: [{ name, type: 'binary', enabled: true }], expect: undefined, attr: 'enabled' },
      { fields: [{ name, type: 'object', enabled: true }], expect: true, attr: 'enabled' },
      { fields: [{ name, type: 'object', enabled: false }], expect: false, attr: 'enabled' },
      {
        fields: [{ name, type: 'object', enabled: false }],
        expect: false,
        attr: 'doc_values',
      },

      // indexed
      { fields: [{ name, type: 'binary' }], expect: false, attr: 'indexed' },
      {
        fields: [{ name, index: true, type: 'binary' }],
        expect: false,
        attr: 'indexed',
      },
      {
        fields: [{ name, index: true, type: 'object', enabled: false }],
        expect: false,
        attr: 'indexed',
      },

      // script, scripted
      { fields: [{ name }], expect: false, attr: 'scripted' },
      { fields: [{ name }], expect: undefined, attr: 'script' },
      { fields: [{ name, script: 'doc[]' }], expect: true, attr: 'scripted' },
      { fields: [{ name, script: 'doc[]' }], expect: 'doc[]', attr: 'script' },

      // lang
      { fields: [{ name }], expect: undefined, attr: 'lang' },
      { fields: [{ name, script: 'doc[]' }], expect: 'painless', attr: 'lang' },
    ];
    tests.forEach((test) => {
      const res = test.fields.map(transformField);
      expect(res[0][test.attr]).toBe(test.expect);
    });
  });

  describe('createFieldFormatMap creates correct map based on inputs', () => {
    test('field with no format or pattern have empty fieldFormatMap', () => {
      const fieldsToFormat = [{ name: 'fieldName', input_format: 'inputFormatVal' }];
      const fieldFormatMap = createFieldFormatMap(fieldsToFormat);
      expect(fieldFormatMap).toEqual({});
    });
    test('field with pattern and no format creates fieldFormatMap with no id', () => {
      const fieldsToFormat = [
        { name: 'fieldName', pattern: 'patternVal', input_format: 'inputFormatVal' },
      ];
      const fieldFormatMap = createFieldFormatMap(fieldsToFormat);
      const expectedFieldFormatMap = {
        fieldName: {
          params: {
            pattern: 'patternVal',
            inputFormat: 'inputFormatVal',
          },
        },
      };
      expect(fieldFormatMap).toEqual(expectedFieldFormatMap);
    });

    test('field with format and params creates fieldFormatMap with id', () => {
      const fieldsToFormat = [
        {
          name: 'fieldName',
          format: 'formatVal',
          pattern: 'patternVal',
          input_format: 'inputFormatVal',
        },
      ];
      const fieldFormatMap = createFieldFormatMap(fieldsToFormat);
      const expectedFieldFormatMap = {
        fieldName: {
          id: 'formatVal',
          params: {
            pattern: 'patternVal',
            inputFormat: 'inputFormatVal',
          },
        },
      };
      expect(fieldFormatMap).toEqual(expectedFieldFormatMap);
    });

    test('all variations and all the params get passed through', () => {
      const fieldsToFormat = [
        { name: 'fieldPattern', pattern: 'patternVal' },
        { name: 'fieldFormat', format: 'formatVal' },
        { name: 'fieldFormatWithParam', format: 'formatVal', output_precision: 2 },
        { name: 'fieldFormatAndPattern', format: 'formatVal', pattern: 'patternVal' },
        {
          name: 'fieldFormatAndAllParams',
          format: 'formatVal',
          pattern: 'pattenVal',
          input_format: 'inputFormatVal',
          output_format: 'outputFormalVal',
          output_precision: 3,
          label_template: 'labelTemplateVal',
          url_template: 'urlTemplateVal',
          openLinkInCurrentTab: true,
        },
      ];
      const fieldFormatMap = createFieldFormatMap(fieldsToFormat);
      expect(fieldFormatMap).toMatchSnapshot('createFieldFormatMap');
    });
  });
});
