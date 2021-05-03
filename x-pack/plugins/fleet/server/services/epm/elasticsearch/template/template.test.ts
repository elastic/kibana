/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

import { safeLoad } from 'js-yaml';

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../../../services';

import type { RegistryDataStream } from '../../../../types';
import { processFields } from '../../fields/field';
import type { Field } from '../../fields/field';

import {
  generateMappings,
  getTemplate,
  getTemplatePriority,
  generateTemplateIndexPattern,
} from './template';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

describe('EPM template', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  it('get template', () => {
    const templateIndexPattern = 'logs-nginx.access-abcd-*';

    const template = getTemplate({
      type: 'logs',
      templateIndexPattern,
      packageName: 'nginx',
      fields: [],
      mappings: { properties: {} },
      composedOfTemplates: [],
      templatePriority: 200,
    });
    expect(template.index_patterns).toStrictEqual([templateIndexPattern]);
  });

  it('adds composed_of correctly', () => {
    const composedOfTemplates = ['component1', 'component2'];

    const template = getTemplate({
      type: 'logs',
      templateIndexPattern: 'name-*',
      packageName: 'nginx',
      fields: [],
      mappings: { properties: {} },
      composedOfTemplates,
      templatePriority: 200,
    });
    expect(template.composed_of).toStrictEqual(composedOfTemplates);
  });

  it('adds empty composed_of correctly', () => {
    const composedOfTemplates: string[] = [];

    const template = getTemplate({
      type: 'logs',
      templateIndexPattern: 'name-*',
      packageName: 'nginx',
      fields: [],
      mappings: { properties: {} },
      composedOfTemplates,
      templatePriority: 200,
    });
    expect(template.composed_of).toStrictEqual(composedOfTemplates);
  });

  it('adds hidden field correctly', () => {
    const templateIndexPattern = 'logs-nginx.access-abcd-*';

    const templateWithHidden = getTemplate({
      type: 'logs',
      templateIndexPattern,
      packageName: 'nginx',
      fields: [],
      mappings: { properties: {} },
      composedOfTemplates: [],
      templatePriority: 200,
      hidden: true,
    });
    expect(templateWithHidden.data_stream.hidden).toEqual(true);

    const templateWithoutHidden = getTemplate({
      type: 'logs',
      templateIndexPattern,
      packageName: 'nginx',
      fields: [],
      mappings: { properties: {} },
      composedOfTemplates: [],
      templatePriority: 200,
    });
    expect(templateWithoutHidden.data_stream.hidden).toEqual(undefined);
  });

  it('tests loading base.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/base.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);

    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    const template = getTemplate({
      type: 'logs',
      templateIndexPattern: 'foo-*',
      packageName: 'nginx',
      fields: processedFields,
      mappings,
      composedOfTemplates: [],
      templatePriority: 200,
    });

    expect(template).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests loading coredns.logs.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/coredns.logs.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);

    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    const template = getTemplate({
      type: 'logs',
      templateIndexPattern: 'foo-*',
      packageName: 'coredns',
      fields: processedFields,
      mappings,
      composedOfTemplates: [],
      templatePriority: 200,
    });

    expect(template).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests loading system.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/system.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);

    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    const template = getTemplate({
      type: 'metrics',
      templateIndexPattern: 'whatsthis-*',
      packageName: 'system',
      fields: processedFields,
      mappings,
      composedOfTemplates: [],
      templatePriority: 200,
    });

    expect(template).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests processing text field with multi fields', () => {
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

  it('tests processing keyword field with multi fields', () => {
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

  it('tests processing keyword field with multi fields with analyzed text field', () => {
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

  it('tests processing keyword field with multi fields with normalized keyword field', () => {
    const keywordWithNormalizedMultiFieldsLiteralYml = `
  - name: keywordWithNormalizedMultiField
    type: keyword
    multi_fields:
      - name: normalized
        type: keyword
        normalizer: lowercase
  `;

    const keywordWithNormalizedMultiFieldsMapping = {
      properties: {
        keywordWithNormalizedMultiField: {
          ignore_above: 1024,
          type: 'keyword',
          fields: {
            normalized: {
              type: 'keyword',
              ignore_above: 1024,
              normalizer: 'lowercase',
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(keywordWithNormalizedMultiFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(keywordWithNormalizedMultiFieldsMapping);
  });

  it('tests processing keyword field with multi fields with long field', () => {
    const keywordWithMultiFieldsLiteralYml = `
      - name: keywordWithMultiFields
        type: keyword
        multi_fields:
          - name: number_memory_devices
            type: long
            normalizer: lowercase
      `;

    const keywordWithMultiFieldsMapping = {
      properties: {
        keywordWithMultiFields: {
          ignore_above: 1024,
          type: 'keyword',
          fields: {
            number_memory_devices: {
              type: 'long',
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

  it('tests processing keyword field with multi fields with double field', () => {
    const keywordWithMultiFieldsLiteralYml = `
      - name: keywordWithMultiFields
        type: keyword
        multi_fields:
          - name: number
            type: double
            normalizer: lowercase
      `;

    const keywordWithMultiFieldsMapping = {
      properties: {
        keywordWithMultiFields: {
          ignore_above: 1024,
          type: 'keyword',
          fields: {
            number: {
              type: 'double',
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

  it('tests processing object field with no other attributes', () => {
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

  it('tests processing object field with enabled set to false', () => {
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

  it('tests processing object field with dynamic set to false', () => {
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

  it('tests processing object field with dynamic set to true', () => {
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

  it('tests processing object field with dynamic set to strict', () => {
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

  it('tests processing object field with property', () => {
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

  it('tests processing object field with property, reverse order', () => {
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

  it('tests processing nested field with property', () => {
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

  it('tests processing nested field with property, nested field first', () => {
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

  it('tests processing nested leaf field with properties', () => {
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

  it('tests constant_keyword field type handling', () => {
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

  it('tests priority and index pattern for data stream without dataset_is_prefix', () => {
    const dataStreamDatasetIsPrefixUnset = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
    } as RegistryDataStream;
    const templateIndexPatternDatasetIsPrefixUnset = 'metrics-package.dataset-*';
    const templatePriorityDatasetIsPrefixUnset = 200;
    const templateIndexPattern = generateTemplateIndexPattern(dataStreamDatasetIsPrefixUnset);
    const templatePriority = getTemplatePriority(dataStreamDatasetIsPrefixUnset);

    expect(templateIndexPattern).toEqual(templateIndexPatternDatasetIsPrefixUnset);
    expect(templatePriority).toEqual(templatePriorityDatasetIsPrefixUnset);
  });

  it('tests priority and index pattern for data stream with dataset_is_prefix set to false', () => {
    const dataStreamDatasetIsPrefixFalse = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: false,
    } as RegistryDataStream;
    const templateIndexPatternDatasetIsPrefixFalse = 'metrics-package.dataset-*';
    const templatePriorityDatasetIsPrefixFalse = 200;
    const templateIndexPattern = generateTemplateIndexPattern(dataStreamDatasetIsPrefixFalse);
    const templatePriority = getTemplatePriority(dataStreamDatasetIsPrefixFalse);

    expect(templateIndexPattern).toEqual(templateIndexPatternDatasetIsPrefixFalse);
    expect(templatePriority).toEqual(templatePriorityDatasetIsPrefixFalse);
  });

  it('tests priority and index pattern for data stream with dataset_is_prefix set to true', () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
    } as RegistryDataStream;
    const templateIndexPatternDatasetIsPrefixTrue = 'metrics-package.dataset.*-*';
    const templatePriorityDatasetIsPrefixTrue = 150;
    const templateIndexPattern = generateTemplateIndexPattern(dataStreamDatasetIsPrefixTrue);
    const templatePriority = getTemplatePriority(dataStreamDatasetIsPrefixTrue);

    expect(templateIndexPattern).toEqual(templateIndexPatternDatasetIsPrefixTrue);
    expect(templatePriority).toEqual(templatePriorityDatasetIsPrefixTrue);
  });
});
