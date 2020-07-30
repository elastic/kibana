/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import path from 'path';
import { Field, processFields } from '../../fields/field';
import { generateMappings, getTemplate } from './template';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

test('get template', () => {
  const templateName = 'logs-nginx-access-abcd';

  const template = getTemplate({
    type: 'logs',
    templateName,
    packageName: 'nginx',
    mappings: { properties: {} },
    composedOfTemplates: [],
  });
  expect(template.index_patterns).toStrictEqual([`${templateName}-*`]);
});

test('adds composed_of correctly', () => {
  const composedOfTemplates = ['component1', 'component2'];

  const template = getTemplate({
    type: 'logs',
    templateName: 'name',
    packageName: 'nginx',
    mappings: { properties: {} },
    composedOfTemplates,
  });
  expect(template.composed_of).toStrictEqual(composedOfTemplates);
});

test('adds empty composed_of correctly', () => {
  const composedOfTemplates: string[] = [];

  const template = getTemplate({
    type: 'logs',
    templateName: 'name',
    packageName: 'nginx',
    mappings: { properties: {} },
    composedOfTemplates,
  });
  expect(template.composed_of).toStrictEqual(composedOfTemplates);
});

test('tests loading base.yml', () => {
  const ymlPath = path.join(__dirname, '../../fields/tests/base.yml');
  const fieldsYML = readFileSync(ymlPath, 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);

  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  const template = getTemplate({
    type: 'logs',
    templateName: 'foo',
    packageName: 'nginx',
    mappings,
    composedOfTemplates: [],
  });

  expect(template).toMatchSnapshot(path.basename(ymlPath));
});

test('tests loading coredns.logs.yml', () => {
  const ymlPath = path.join(__dirname, '../../fields/tests/coredns.logs.yml');
  const fieldsYML = readFileSync(ymlPath, 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);

  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  const template = getTemplate({
    type: 'logs',
    templateName: 'foo',
    packageName: 'coredns',
    mappings,
    composedOfTemplates: [],
  });

  expect(template).toMatchSnapshot(path.basename(ymlPath));
});

test('tests loading system.yml', () => {
  const ymlPath = path.join(__dirname, '../../fields/tests/system.yml');
  const fieldsYML = readFileSync(ymlPath, 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);

  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  const template = getTemplate({
    type: 'metrics',
    templateName: 'whatsthis',
    packageName: 'system',
    mappings,
    composedOfTemplates: [],
  });

  expect(template).toMatchSnapshot(path.basename(ymlPath));
});

test('tests processing text field with multi fields', () => {
  const textWithMultiFieldsLiteralYml = `
- name: textWithMultiFields
  type: text
  multi_fields:
    - name: raw
      type: keyword
    - name: indexed
      type: text
`;
  const textWithMultiFieldsMapping = {
    properties: {
      textWithMultiFields: {
        type: 'text',
        fields: {
          raw: {
            ignore_above: 1024,
            type: 'keyword',
          },
          indexed: {
            type: 'text',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(textWithMultiFieldsLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(textWithMultiFieldsMapping);
});

test('tests processing keyword field with multi fields', () => {
  const keywordWithMultiFieldsLiteralYml = `
- name: keywordWithMultiFields
  type: keyword
  multi_fields:
    - name: raw
      type: keyword
    - name: indexed
      type: text
`;

  const keywordWithMultiFieldsMapping = {
    properties: {
      keywordWithMultiFields: {
        ignore_above: 1024,
        type: 'keyword',
        fields: {
          raw: {
            ignore_above: 1024,
            type: 'keyword',
          },
          indexed: {
            type: 'text',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(keywordWithMultiFieldsLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(keywordWithMultiFieldsMapping);
});

test('tests processing keyword field with multi fields with analyzed text field', () => {
  const keywordWithAnalyzedMultiFieldsLiteralYml = `
  - name: keywordWithAnalyzedMultiField
    type: keyword
    multi_fields:
      - name: analyzed
        type: text
        analyzer: autocomplete
        search_analyzer: standard
  `;

  const keywordWithAnalyzedMultiFieldsMapping = {
    properties: {
      keywordWithAnalyzedMultiField: {
        ignore_above: 1024,
        type: 'keyword',
        fields: {
          analyzed: {
            analyzer: 'autocomplete',
            search_analyzer: 'standard',
            type: 'text',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(keywordWithAnalyzedMultiFieldsLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(keywordWithAnalyzedMultiFieldsMapping);
});

test('tests processing object field with no other attributes', () => {
  const objectFieldLiteralYml = `
- name: objectField
  type: object
`;
  const objectFieldMapping = {
    properties: {
      objectField: {
        type: 'object',
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldMapping);
});

test('tests processing object field with enabled set to false', () => {
  const objectFieldEnabledFalseLiteralYml = `
- name: objectField
  type: object
  enabled: false
`;
  const objectFieldEnabledFalseMapping = {
    properties: {
      objectField: {
        type: 'object',
        enabled: false,
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldEnabledFalseLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldEnabledFalseMapping);
});

test('tests processing object field with dynamic set to false', () => {
  const objectFieldDynamicFalseLiteralYml = `
- name: objectField
  type: object
  dynamic: false
`;
  const objectFieldDynamicFalseMapping = {
    properties: {
      objectField: {
        type: 'object',
        dynamic: false,
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldDynamicFalseLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldDynamicFalseMapping);
});

test('tests processing object field with dynamic set to true', () => {
  const objectFieldDynamicTrueLiteralYml = `
- name: objectField
  type: object
  dynamic: true
`;
  const objectFieldDynamicTrueMapping = {
    properties: {
      objectField: {
        type: 'object',
        dynamic: true,
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldDynamicTrueLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldDynamicTrueMapping);
});

test('tests processing object field with dynamic set to strict', () => {
  const objectFieldDynamicStrictLiteralYml = `
- name: objectField
  type: object
  dynamic: strict
`;
  const objectFieldDynamicStrictMapping = {
    properties: {
      objectField: {
        type: 'object',
        dynamic: 'strict',
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldDynamicStrictLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldDynamicStrictMapping);
});

test('tests processing object field with property', () => {
  const objectFieldWithPropertyLiteralYml = `
- name: a
  type: object
- name: a.b
  type: keyword
  `;
  const objectFieldWithPropertyMapping = {
    properties: {
      a: {
        properties: {
          b: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldWithPropertyLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldWithPropertyMapping);
});

test('tests processing object field with property, reverse order', () => {
  const objectFieldWithPropertyReversedLiteralYml = `
- name: a.b
  type: keyword
- name: a
  type: object
  dynamic: false
  `;
  const objectFieldWithPropertyReversedMapping = {
    properties: {
      a: {
        dynamic: false,
        properties: {
          b: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(objectFieldWithPropertyReversedLiteralYml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(objectFieldWithPropertyReversedMapping);
});

test('tests processing nested field with property', () => {
  const nestedYaml = `
  - name: a.b
    type: keyword
  - name: a
    type: nested
    dynamic: false
    `;
  const expectedMapping = {
    properties: {
      a: {
        dynamic: false,
        type: 'nested',
        properties: {
          b: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(nestedYaml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(expectedMapping);
});

test('tests processing nested field with property, nested field first', () => {
  const nestedYaml = `
  - name: a
    type: nested
    include_in_parent: true
  - name: a.b
    type: keyword
    `;
  const expectedMapping = {
    properties: {
      a: {
        include_in_parent: true,
        type: 'nested',
        properties: {
          b: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(nestedYaml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(expectedMapping);
});

test('tests processing nested leaf field with properties', () => {
  const nestedYaml = `
  - name: a
    type: object
    dynamic: false
  - name: a.b
    type: nested
    enabled: false
    `;
  const expectedMapping = {
    properties: {
      a: {
        dynamic: false,
        properties: {
          b: {
            enabled: false,
            type: 'nested',
          },
        },
      },
    },
  };
  const fields: Field[] = safeLoad(nestedYaml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(mappings).toEqual(expectedMapping);
});

test('tests constant_keyword field type handling', () => {
  const constantKeywordLiteralYaml = `
- name: constantKeyword
  type: constant_keyword
  `;
  const constantKeywordMapping = {
    properties: {
      constantKeyword: {
        type: 'constant_keyword',
      },
    },
  };
  const fields: Field[] = safeLoad(constantKeywordLiteralYaml);
  const processedFields = processFields(fields);
  const mappings = generateMappings(processedFields);
  expect(JSON.stringify(mappings)).toEqual(JSON.stringify(constantKeywordMapping));
});
