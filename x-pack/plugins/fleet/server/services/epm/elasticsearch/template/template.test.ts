/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

import { safeLoad } from 'js-yaml';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { errors } from '@elastic/elasticsearch';

import { STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS } from '../../../../constants/fleet_es_assets';

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';
import type { RegistryDataStream } from '../../../../types';
import { processFields } from '../../fields/field';
import type { Field } from '../../fields/field';
import {
  FLEET_COMPONENT_TEMPLATES,
  STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
  FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
  STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
} from '../../../../constants';

import {
  generateMappings,
  getTemplate,
  getTemplatePriority,
  generateTemplateIndexPattern,
  updateCurrentWriteIndices,
} from './template';

const FLEET_COMPONENT_TEMPLATES_NAMES = FLEET_COMPONENT_TEMPLATES.map(
  (componentTemplate) => componentTemplate.name
);

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
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(template.index_patterns).toStrictEqual([templateIndexPattern]);
  });

  it('adds composed_of correctly', () => {
    const composedOfTemplates = ['component1', 'component2'];

    const template = getTemplate({
      templateIndexPattern: 'logs-*',
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates,
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(template.composed_of).toStrictEqual([
      STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS,
      STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
      ...composedOfTemplates,
      STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
      ...FLEET_COMPONENT_TEMPLATES_NAMES,
    ]);
  });

  it('supplies metrics@tsdb-settings for time series', () => {
    const composedOfTemplates = ['component1', 'component2'];

    const template = getTemplate({
      templateIndexPattern: 'metrics-*',
      type: 'metrics',
      packageName: 'nginx',
      composedOfTemplates,
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: true,
    });
    expect(template.composed_of).toStrictEqual([
      'metrics@tsdb-settings',
      ...composedOfTemplates,
      STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
      ...FLEET_COMPONENT_TEMPLATES_NAMES,
    ]);
  });

  it('does not create fleet agent id verification component template if agentIdVerification is disabled', () => {
    appContextService.start(
      createAppContextStartContractMock({
        agentIdVerificationEnabled: false,
      })
    );
    const composedOfTemplates = ['component1', 'component2'];

    const template = getTemplate({
      templateIndexPattern: 'logs-*',
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates,
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(template.composed_of).toStrictEqual([
      STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS,
      STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
      ...composedOfTemplates,
      STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
      FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
    ]);
  });

  it('adds empty composed_of correctly', () => {
    const composedOfTemplates: string[] = [];

    const template = getTemplate({
      templateIndexPattern: 'logs-*',
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates,
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(template.composed_of).toStrictEqual([
      STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS,
      STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
      STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
      ...FLEET_COMPONENT_TEMPLATES_NAMES,
    ]);
  });

  it('adds hidden field correctly', () => {
    const templateIndexPattern = 'logs-nginx.access-abcd-*';

    const templateWithHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      hidden: true,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithHidden.data_stream.hidden).toEqual(true);

    const templateWithoutHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithoutHidden.data_stream.hidden).toEqual(undefined);
  });

  it('adds index_template.data_stream.hidden field correctly', () => {
    const templateIndexPattern = 'logs-nginx.access-abcd-*';

    const templateWithGlobalAndDataStreamHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      hidden: false,
      mappings: { properties: [] },
      registryElasticsearch: {
        'index_template.data_stream': {
          hidden: true,
        },
      },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithGlobalAndDataStreamHidden.data_stream.hidden).toEqual(true);

    const templateWithDataStreamHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      mappings: { properties: [] },
      registryElasticsearch: {
        'index_template.data_stream': {
          hidden: true,
        },
      },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithDataStreamHidden.data_stream.hidden).toEqual(true);

    const templateWithoutDataStreamHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      hidden: true,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithoutDataStreamHidden.data_stream.hidden).toEqual(true);

    const templateWithGlobalHiddenTrueAndDataStreamHiddenFalse = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      hidden: true,
      mappings: { properties: [] },
      registryElasticsearch: {
        'index_template.data_stream': {
          hidden: false,
        },
      },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithGlobalHiddenTrueAndDataStreamHiddenFalse.data_stream.hidden).toEqual(true);

    const templateWithoutHidden = getTemplate({
      templateIndexPattern,
      type: 'logs',
      packageName: 'nginx',
      composedOfTemplates: [],
      templatePriority: 200,
      mappings: { properties: [] },
      isIndexModeTimeSeries: false,
    });
    expect(templateWithoutHidden.data_stream.hidden).toEqual(undefined);
  });

  it('tests loading base.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/base.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);

    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);

    expect(mappings).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests loading coredns.logs.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/coredns.logs.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);

    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);

    expect(mappings).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests loading system.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/system.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);
    const processedFields = processFields(fields);

    const mappings = generateMappings(processedFields);

    expect(mappings).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests loading cockroachdb_dynamic_templates.yml', () => {
    const ymlPath = path.join(__dirname, '../../fields/tests/cockroachdb_dynamic_templates.yml');
    const fieldsYML = readFileSync(ymlPath, 'utf-8');
    const fields: Field[] = safeLoad(fieldsYML);
    const processedFields = processFields(fields);

    const mappings = generateMappings(processedFields);

    expect(mappings).toMatchSnapshot(path.basename(ymlPath));
  });

  it('tests processing long field with index false', () => {
    const longWithIndexFalseYml = `
- name: longIndexFalse
  type: long
  index: false
`;
    const longWithIndexFalseMapping = {
      properties: {
        longIndexFalse: {
          type: 'long',
          index: false,
        },
      },
    };
    const fields: Field[] = safeLoad(longWithIndexFalseYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(longWithIndexFalseMapping);
  });

  it('tests processing keyword field with doc_values false', () => {
    const keywordWithIndexFalseYml = `
- name: keywordIndexFalse
  type: keyword
  doc_values: false
`;
    const keywordWithIndexFalseMapping = {
      properties: {
        keywordIndexFalse: {
          type: 'keyword',
          doc_values: false,
        },
      },
    };
    const fields: Field[] = safeLoad(keywordWithIndexFalseYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(keywordWithIndexFalseMapping);
  });

  it('tests processing text field with store true', () => {
    const textWithStoreTrueYml = `
- name: someTextId
  type: text
  store: true
`;
    const textWithStoreTrueMapping = {
      properties: {
        someTextId: {
          type: 'text',
          store: true,
        },
      },
    };
    const fields: Field[] = safeLoad(textWithStoreTrueYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(textWithStoreTrueMapping);
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

  it('tests processing date field with format', () => {
    const dateWithFormatYml = `
- name: dateWithFormat
  type: date
  date_format: yyyy-MM-dd
`;

    const dateWithMapping = {
      properties: {
        dateWithFormat: {
          type: 'date',
          format: 'yyyy-MM-dd',
        },
      },
    };
    const fields: Field[] = safeLoad(dateWithFormatYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(dateWithMapping);
  });

  it('tests processing wildcard field with multi fields', () => {
    const keywordWithMultiFieldsLiteralYml = `
- name: keywordWithMultiFields
  type: wildcard
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
          type: 'wildcard',
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

  it('tests processing wildcard field with multi fields with match_only_text type', () => {
    const wildcardWithMultiFieldsLiteralYml = `
- name: wildcardWithMultiFields
  type: wildcard
  multi_fields:
    - name: text
      type: match_only_text
`;

    const wildcardWithMultiFieldsMapping = {
      properties: {
        wildcardWithMultiFields: {
          ignore_above: 1024,
          type: 'wildcard',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(wildcardWithMultiFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(wildcardWithMultiFieldsMapping);
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

  it('tests processing object field with subobjects set to false (case B)', () => {
    const objectFieldWithPropertyReversedLiteralYml = `
- name: b.labels.*
  type: object
  object_type: keyword
  subobjects: false
  `;
    const objectFieldWithPropertyReversedMapping = {
      dynamic_templates: [
        {
          'b.labels.*': {
            path_match: 'b.labels.*',
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword',
            },
          },
        },
      ],
      properties: {
        b: {
          type: 'object',
          dynamic: true,
          properties: {
            labels: {
              dynamic: true,
              type: 'object',
              subobjects: false,
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

  it('tests processing object field with subobjects set to false (case D)', () => {
    const objectFieldWithPropertyReversedLiteralYml = `
- name: d.labels
  type: object
  object_type: keyword
  subobjects: false
  `;
    const objectFieldWithPropertyReversedMapping = {
      dynamic_templates: [
        {
          'd.labels': {
            path_match: 'd.labels.*',
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword',
            },
          },
        },
      ],
      properties: {
        d: {
          type: 'object',
          dynamic: true,
          properties: {
            labels: {
              dynamic: true,
              type: 'object',
              subobjects: false,
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

  it('tests processing nested field with subobject, nested field first', () => {
    const nestedYaml = `
  - name: a
    type: nested
    include_in_parent: true
  - name: a.b
    type: group
    fields:
      - name: c
        type: keyword
    `;
    const expectedMapping = {
      properties: {
        a: {
          include_in_parent: true,
          type: 'nested',
          properties: {
            b: {
              properties: {
                c: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
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

  it('tests processing nested field with subfields', () => {
    const nestedYaml = `
  - name: a
    type: nested
    include_in_parent: true
    fields:
    - name: b
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

  it('tests processing nested field with subobjects', () => {
    const nestedYaml = `
  - name: a
    type: nested
    include_in_parent: true
    fields:
    - name: b
      type: group
      fields:
      - name: c
        type: keyword
    `;
    const expectedMapping = {
      properties: {
        a: {
          include_in_parent: true,
          type: 'nested',
          properties: {
            b: {
              properties: {
                c: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
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

  it('tests constant_keyword field type with value', () => {
    const constantKeywordLiteralYaml = `
- name: constantKeyword
  type: constant_keyword
  value: always_the_same
  `;
    const constantKeywordMapping = {
      properties: {
        constantKeyword: {
          type: 'constant_keyword',
          value: 'always_the_same',
        },
      },
    };
    const fields: Field[] = safeLoad(constantKeywordLiteralYaml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(JSON.stringify(mappings)).toEqual(JSON.stringify(constantKeywordMapping));
  });

  it('tests processing dimension field on a keyword', () => {
    const literalYml = `
- name: example.id
  type: keyword
  dimension: true
  `;
    const expectedMapping = {
      properties: {
        example: {
          properties: {
            id: {
              time_series_dimension: true,
              type: 'keyword',
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(expectedMapping);
  });

  it('tests processing dimension field on a keyword - tsdb disabled', () => {
    const literalYml = `
- name: example.id
  type: keyword
  dimension: true
  `;
    const expectedMapping = {
      properties: {
        example: {
          properties: {
            id: {
              type: 'keyword',
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, false);
    expect(mappings).toEqual(expectedMapping);
  });

  it('tests processing dimension field on a long', () => {
    const literalYml = `
- name: example.id
  type: long
  dimension: true
  `;
    const expectedMapping = {
      properties: {
        example: {
          properties: {
            id: {
              time_series_dimension: true,
              type: 'long',
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(expectedMapping);
  });

  it('tests processing metric_type field', () => {
    const literalYml = `
- name: total.norm.pct
  type: scaled_float
  metric_type: gauge
  unit: percent
  format: percent
`;
    const expectedMapping = {
      properties: {
        total: {
          properties: {
            norm: {
              properties: {
                pct: {
                  scaling_factor: 1000,
                  type: 'scaled_float',
                  meta: {
                    unit: 'percent',
                  },
                  time_series_metric: 'gauge',
                },
              },
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(expectedMapping);
  });

  it('tests processing metric_type field - tsdb disabled', () => {
    const literalYml = `
- name: total.norm.pct
  type: scaled_float
  metric_type: gauge
  unit: percent
  format: percent
`;
    const expectedMapping = {
      properties: {
        total: {
          properties: {
            norm: {
              properties: {
                pct: {
                  scaling_factor: 1000,
                  type: 'scaled_float',
                  meta: {
                    unit: 'percent',
                  },
                },
              },
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, false);
    expect(mappings).toEqual(expectedMapping);
  });

  it('tests processing metric_type field with long field', () => {
    const literalYml = `
    - name: total
      type: long
      format: bytes
      unit: byte
      metric_type: gauge
      description: |
        Total swap memory.
`;
    const expectedMapping = {
      properties: {
        total: {
          type: 'long',
          meta: {
            unit: 'byte',
          },
          time_series_metric: 'gauge',
        },
      },
    };
    const fields: Field[] = safeLoad(literalYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(expectedMapping);
  });

  it('processes meta fields', () => {
    const metaFieldLiteralYaml = `
- name: fieldWithMetas
  type: integer
  unit: byte
  `;
    const metaFieldMapping = {
      properties: {
        fieldWithMetas: {
          type: 'long',
          meta: {
            unit: 'byte',
          },
        },
      },
    };
    const fields: Field[] = safeLoad(metaFieldLiteralYaml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(JSON.stringify(mappings)).toEqual(JSON.stringify(metaFieldMapping));
  });

  it('processes grouped meta fields', () => {
    const metaFieldLiteralYaml = `
- name: groupWithMetas
  type: group
  unit: byte
  fields:
    - name: fieldA
      type: integer
      unit: byte
    - name: fieldB
      type: integer
      unit: byte
  `;
    const metaFieldMapping = {
      properties: {
        groupWithMetas: {
          properties: {
            fieldA: {
              type: 'long',
              meta: {
                unit: 'byte',
              },
            },
            fieldB: {
              type: 'long',
              meta: {
                unit: 'byte',
              },
            },
          },
        },
      },
    };
    const fields: Field[] = safeLoad(metaFieldLiteralYaml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(JSON.stringify(mappings)).toEqual(JSON.stringify(metaFieldMapping));
  });

  it('tests processing field of aggregate_metric_double type', () => {
    const fieldLiteralYaml = `
    - name: aggregate_metric
      type: aggregate_metric_double
      metrics: ["min", "max", "sum", "value_count"]
      default_metric: "max"
    `;
    const fieldMapping = {
      properties: {
        aggregate_metric: {
          metrics: ['min', 'max', 'sum', 'value_count'],
          default_metric: 'max',
          type: 'aggregate_metric_double',
        },
      },
    };
    const fields: Field[] = safeLoad(fieldLiteralYaml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(JSON.stringify(mappings)).toEqual(JSON.stringify(fieldMapping));
  });

  it('tests processing runtime fields without script', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: runtime_field
  type: boolean
  runtime: true
`;
    const runtimeFieldMapping = {
      properties: {},
      runtime: {
        runtime_field: {
          type: 'boolean',
        },
      },
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing runtime fields with painless script', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: day_of_week
  type: date
  runtime: |
    emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))
`;
    const runtimeFieldMapping = {
      properties: {},
      runtime: {
        day_of_week: {
          type: 'date',
          script: {
            source:
              "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
          },
        },
      },
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing runtime fields defined in a group', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: responses
  type: group
  fields:
    - name: day_of_week
      type: date
      date_format: date_optional_time
      runtime: |
        emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))
`;
    const runtimeFieldMapping = {
      properties: {},
      runtime: {
        'responses.day_of_week': {
          type: 'date',
          format: 'date_optional_time',
          script: {
            source:
              "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
          },
        },
      },
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing runtime fields in a dynamic template', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: labels.*
  type: keyword
  runtime: true
`;
    const runtimeFieldMapping = {
      properties: {
        labels: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'labels.*': {
            match_mapping_type: 'string',
            path_match: 'labels.*',
            runtime: {
              type: 'keyword',
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing store true in a dynamic template', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: messages.*
  type: text
  store: true
`;
    const runtimeFieldMapping = {
      properties: {
        messages: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'messages.*': {
            match_mapping_type: 'string',
            path_match: 'messages.*',
            mapping: {
              type: 'text',
              store: true,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing dimension fields on a dynamic template object', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: labels.*
  type: object
  object_type: keyword
  dimension: true
`;
    const runtimeFieldMapping = {
      properties: {
        labels: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'labels.*': {
            match_mapping_type: 'string',
            path_match: 'labels.*',
            mapping: {
              type: 'keyword',
              time_series_dimension: true,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing dimension fields on a dynamic template field', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: labels.*
  type: keyword
  dimension: true
`;
    const runtimeFieldMapping = {
      properties: {
        labels: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'labels.*': {
            match_mapping_type: 'string',
            path_match: 'labels.*',
            mapping: {
              type: 'keyword',
              time_series_dimension: true,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing scaled_float fields in a dynamic template', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: numeric_labels
  type: object
  object_type: scaled_float
`;
    const runtimeFieldMapping = {
      properties: {
        numeric_labels: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          numeric_labels: {
            match_mapping_type: '*',
            path_match: 'numeric_labels.*',
            mapping: {
              type: 'scaled_float',
              scaling_factor: 1000,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing aggregate_metric_double fields in a dynamic template', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: aggregate.*
  type: aggregate_metric_double
  metrics: ["min", "max", "sum", "value_count"]
  default_metric: "max"
`;
    const runtimeFieldMapping = {
      properties: {
        aggregate: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'aggregate.*': {
            match_mapping_type: '*',
            path_match: 'aggregate.*',
            mapping: {
              type: 'aggregate_metric_double',
              metrics: ['min', 'max', 'sum', 'value_count'],
              default_metric: 'max',
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing group sub fields in a dynamic template', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: group.*.network
  type: group
  fields:
  - name: bytes
    type: integer
    metric_type: counter
`;
    const runtimeFieldMapping = {
      properties: {
        group: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'group.*.network.bytes': {
            match_mapping_type: 'long',
            path_match: 'group.*.network.bytes',
            mapping: {
              type: 'long',
              time_series_metric: 'counter',
            },
          },
        },
        {
          'group.*.network': {
            path_match: 'group.*.network',
            match_mapping_type: 'object',
            mapping: {
              type: 'object',
              dynamic: true,
            },
          },
        },
        {
          'group.*': {
            path_match: 'group.*',
            match_mapping_type: 'object',
            mapping: {
              type: 'object',
              dynamic: true,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests processing dynamic templates priority of intermediate objects', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: group.*.value
  type: object
  object_type: double
  object_type_mapping_type: "*"
  metric_type: gauge
- name: group.*.histogram
  type: object
  object_type: histogram
  object_type_mapping_type: "*"
`;
    const runtimeFieldMapping = {
      properties: {
        group: {
          type: 'object',
          dynamic: true,
        },
      },
      dynamic_templates: [
        {
          'group.*.value': {
            match_mapping_type: '*',
            path_match: 'group.*.value',
            mapping: {
              time_series_metric: 'gauge',
              type: 'double',
            },
          },
        },
        {
          'group.*.histogram': {
            path_match: 'group.*.histogram',
            match_mapping_type: '*',
            mapping: {
              type: 'histogram',
            },
          },
        },
        {
          'group.*': {
            path_match: 'group.*',
            match_mapping_type: 'object',
            mapping: {
              type: 'object',
              dynamic: true,
            },
          },
        },
      ],
    };
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    const processedFields = processFields(fields);
    const mappings = generateMappings(processedFields, true);
    expect(mappings).toEqual(runtimeFieldMapping);
  });

  it('tests unexpected type for field as dynamic template fails', () => {
    const textWithRuntimeFieldsLiteralYml = `
- name: labels.*
  type: object
  object_type: constant_keyword
`;
    const fields: Field[] = safeLoad(textWithRuntimeFieldsLiteralYml);
    expect(() => {
      const processedFields = processFields(fields);
      generateMappings(processedFields);
    }).toThrow();
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

  describe('updateCurrentWriteIndices', () => {
    it('update all the index matching, index template index pattern', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: { properties: {} },
        },
      } as any);
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test.*-*'],
            template: {
              settings: { index: {} },
              mappings: { properties: {} },
            },
          } as any,
        },
      ]);
      expect(esClient.indices.getDataStream).toBeCalledWith({
        name: 'test.*-*',
        expand_wildcards: ['open', 'hidden'],
      });
      const putMappingsCall = esClient.indices.putMapping.mock.calls.map(([{ index }]) => index);
      expect(putMappingsCall).toHaveLength(1);
      expect(putMappingsCall[0]).toBe('test.prefix1-default');
    });
    it('update non replicated datastream', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [
          { name: 'test-non-replicated' },
          { name: 'test-replicated', replicated: true },
        ],
      } as any);

      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: { properties: {} },
          lifecycle: {
            data_retention: '7d',
          },
        },
      } as any);

      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test-*'],
            template: {
              settings: { index: {} },
              mappings: { properties: {} },
            },
          } as any,
        },
      ]);

      const putMappingsCall = esClient.indices.putMapping.mock.calls.map(([{ index }]) => index);
      expect(putMappingsCall).toHaveLength(1);
      expect(putMappingsCall[0]).toBe('test-non-replicated');

      const putDatastreamLifecycleCalls = esClient.transport.request.mock.calls;
      expect(putDatastreamLifecycleCalls).toHaveLength(1);
      expect(putDatastreamLifecycleCalls[0][0]).toEqual({
        method: 'PUT',
        path: '_data_stream/test-non-replicated/_lifecycle',
        body: {
          data_retention: '7d',
        },
      });
    });

    it('should fill constant keywords from previous mappings', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      esClient.indices.getDataStream.mockResponse({
        data_streams: [
          {
            name: 'test-constant.keyword-default',
            indices: [
              { index_name: '.ds-test-constant.keyword-default-0001' },
              { index_name: '.ds-test-constant.keyword-default-0002' },
            ],
          },
        ],
      } as any);

      esClient.indices.get.mockResponse({
        'test-constant.keyword-default': {
          mappings: {
            properties: {
              some_keyword_field: {
                type: 'constant_keyword',
              },
            },
          },
        },
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: {
            properties: {
              some_keyword_field: {
                type: 'constant_keyword',
                value: 'some_value',
              },
            },
          },
        },
      } as any);
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test-constant.keyword-*'],
            template: {
              template: {
                settings: { index: {} },
                mappings: { properties: {} },
              },
            },
          } as any,
        },
      ]);
      expect(esClient.indices.get).toBeCalledWith({
        index: '.ds-test-constant.keyword-default-0002',
      });
      const putMappingsCalls = esClient.indices.putMapping.mock.calls;
      expect(putMappingsCalls).toHaveLength(1);
      expect(putMappingsCalls[0][0]).toEqual({
        index: 'test-constant.keyword-default',
        body: {
          properties: {
            some_keyword_field: {
              type: 'constant_keyword',
              value: 'some_value',
            },
          },
        },
        write_index_only: true,
      });
    });

    it('should not error when previous mappings are not found', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test-constant.keyword-default' }],
      } as any);
      esClient.indices.get.mockResponse({
        'test-constant.keyword-default': {
          mappings: {
            properties: {
              some_keyword_field: {
                type: 'constant_keyword',
              },
            },
          },
        },
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {},
      } as any);
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test-constant.keyword-*'],
            template: {
              template: {
                settings: { index: {} },
                mappings: { properties: {} },
              },
            },
          } as any,
        },
      ]);
      const putMappingsCalls = esClient.indices.putMapping.mock.calls;
      expect(putMappingsCalls).toHaveLength(1);
      expect(putMappingsCalls[0][0]).toEqual({
        index: 'test-constant.keyword-default',
        body: {},
        write_index_only: true,
      });
    });

    it('should rollover on expected error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.simulateTemplate.mockImplementation(() => {
        throw new errors.ResponseError({
          statusCode: 400,
          body: {
            error: {
              type: 'illegal_argument_exception',
            },
          },
        } as any);
      });
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test.*-*'],
            template: {
              settings: { index: {} },
              mappings: { properties: {} },
            },
          } as any,
        },
      ]);

      expect(esClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test.prefix1-default/_rollover',
          querystring: {
            lazy: true,
          },
        })
      );
    });

    it('should rollover on expected error when field subobjects in mappings changed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.get.mockResponse({
        'test.prefix1-default': {
          mappings: {},
        },
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: { subobjects: false },
        },
      } as any);
      esClient.indices.putMapping.mockImplementation(() => {
        throw new errors.ResponseError({
          body: {
            error: {
              message:
                'mapper_exception\n' +
                '\tRoot causes:\n' +
                "\t\tmapper_exception: the [subobjects] parameter can't be updated for the object mapping [_doc]",
            },
          },
        } as any);
      });

      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test.*-*'],
            template: {
              settings: { index: {} },
              mappings: {},
            },
          } as any,
        },
      ]);

      expect(esClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test.prefix1-default/_rollover',
          querystring: {
            lazy: true,
          },
        })
      );
    });
    it('should skip rollover on expected error when flag is on', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.simulateTemplate.mockImplementation(() => {
        throw new errors.ResponseError({
          statusCode: 400,
          body: {
            error: {
              type: 'illegal_argument_exception',
            },
          },
        } as any);
      });
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(
        esClient,
        logger,
        [
          {
            templateName: 'test',
            indexTemplate: {
              index_patterns: ['test.*-*'],
              template: {
                settings: { index: {} },
                mappings: { properties: {} },
              },
            } as any,
          },
        ],
        {
          skipDataStreamRollover: true,
        }
      );

      expect(esClient.indices.rollover).not.toHaveBeenCalled();
    });
    it('should not rollover on unexpected error', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.simulateTemplate.mockImplementation(() => {
        throw new Error();
      });
      const logger = loggerMock.create();
      try {
        await updateCurrentWriteIndices(esClient, logger, [
          {
            templateName: 'test',
            indexTemplate: {
              index_patterns: ['test.*-*'],
              template: {
                settings: { index: {} },
                mappings: { properties: {} },
              },
            } as any,
          },
        ]);
        fail('expected updateCurrentWriteIndices to throw error');
      } catch (err) {
        // noop
      }

      expect(esClient.indices.rollover).not.toHaveBeenCalled();
    });
    it('should not throw on unexpected error when flag is on', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.simulateTemplate.mockImplementation(() => {
        throw new Error();
      });
      const logger = loggerMock.create();
      await updateCurrentWriteIndices(
        esClient,
        logger,
        [
          {
            templateName: 'test',
            indexTemplate: {
              index_patterns: ['test.*-*'],
              template: {
                settings: { index: {} },
                mappings: { properties: {} },
              },
            } as any,
          },
        ],
        {
          ignoreMappingUpdateErrors: true,
        }
      );

      expect(esClient.indices.rollover).not.toHaveBeenCalled();
    });

    it('should rollover on dynamic dimension mappings changed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.get.mockResponse({
        'test.prefix1-default': {
          mappings: {},
        },
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: {
            dynamic_templates: [
              { 'prometheus.labels.*': { mapping: { time_series_dimension: true } } },
            ],
          },
        },
      } as any);

      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test.*-*'],
            template: {
              settings: { index: {} },
              mappings: {},
            },
          } as any,
        },
      ]);

      expect(esClient.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test.prefix1-default/_rollover',
          querystring: {
            lazy: true,
          },
        })
      );
    });

    it('should not rollover on dynamic dimension mappings not changed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResponse({
        data_streams: [{ name: 'test.prefix1-default' }],
      } as any);
      esClient.indices.get.mockResponse({
        'test.prefix1-default': {
          mappings: {
            dynamic_templates: [
              { 'prometheus.labels.*': { mapping: { time_series_dimension: true } } },
              { 'prometheus.test.*': { mapping: { time_series_dimension: true } } },
            ],
          },
        },
      } as any);
      esClient.indices.simulateTemplate.mockResponse({
        template: {
          settings: { index: {} },
          mappings: {
            dynamic_templates: [
              { 'prometheus.test.*': { mapping: { time_series_dimension: true } } },
              { 'prometheus.labels.*': { mapping: { time_series_dimension: true } } },
            ],
          },
        },
      } as any);

      const logger = loggerMock.create();
      await updateCurrentWriteIndices(esClient, logger, [
        {
          templateName: 'test',
          indexTemplate: {
            index_patterns: ['test.*-*'],
            template: {
              settings: { index: {} },
              mappings: {},
            },
          } as any,
        },
      ]);

      expect(esClient.transport.request).not.toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test.prefix1-default/_rollover',
          querystring: {
            lazy: true,
          },
        })
      );
    });
  });
});
