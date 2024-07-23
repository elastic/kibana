/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../constants', () => {
  const { TYPE_DEFINITION } = jest.requireActual('../constants');
  return { MAIN_DATA_TYPE_DEFINITION: {}, TYPE_DEFINITION };
});

import { Fields, NormalizedFields, State } from '../types';
import {
  stripUndefinedValues,
  getTypeLabelFromField,
  getFieldMeta,
  getFieldsFromState,
  getAllFieldTypesFromState,
  getFieldsMatchingFilterFromState,
  getStateWithCopyToFields,
} from './utils';

const fieldsWithnestedFields: NormalizedFields = {
  byId: {
    '4459e8f2-3bec-4d17-b50c-f62d1fcbcca0': {
      id: '4459e8f2-3bec-4d17-b50c-f62d1fcbcca0',
      parentId: 'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420',
      nestedDepth: 1,
      isMultiField: false,
      path: ['multifield', 'flag'],
      source: {
        name: 'flag',
        type: 'boolean',
      },
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
    '20fffee6-2a94-4aa6-b7e4-1cd745d6f775': {
      id: '20fffee6-2a94-4aa6-b7e4-1cd745d6f775',
      parentId: '97399281-b0b2-4490-9931-6cc92676b305',
      nestedDepth: 3,
      isMultiField: false,
      path: ['multifield', 'points', 'entity', 'entity_1'],
      source: {
        name: 'entity_1',
        type: 'keyword',
      },
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
    '97399281-b0b2-4490-9931-6cc92676b305': {
      id: '97399281-b0b2-4490-9931-6cc92676b305',
      parentId: '9031c735-a445-491f-948d-41989b51a1a3',
      nestedDepth: 2,
      isMultiField: false,
      path: ['multifield', 'points', 'entity'],
      source: {
        name: 'entity',
        type: 'object',
      },
      childFieldsName: 'properties',
      canHaveChildFields: true,
      hasChildFields: true,
      canHaveMultiFields: false,
      hasMultiFields: false,
      isExpanded: false,
      childFields: ['20fffee6-2a94-4aa6-b7e4-1cd745d6f775'],
    },
    'af9b7a29-8c44-4dbe-baa0-c29eb1760d96': {
      id: 'af9b7a29-8c44-4dbe-baa0-c29eb1760d96',
      parentId: '9031c735-a445-491f-948d-41989b51a1a3',
      nestedDepth: 2,
      isMultiField: false,
      path: ['multifield', 'points', 'name'],
      source: {
        name: 'name',
        type: 'text',
      },
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
    '9031c735-a445-491f-948d-41989b51a1a3': {
      id: '9031c735-a445-491f-948d-41989b51a1a3',
      parentId: 'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420',
      nestedDepth: 1,
      isMultiField: false,
      path: ['multifield', 'points'],
      source: {
        name: 'points',
        type: 'object',
      },
      childFieldsName: 'properties',
      canHaveChildFields: true,
      hasChildFields: true,
      canHaveMultiFields: false,
      hasMultiFields: false,
      isExpanded: false,
      childFields: ['97399281-b0b2-4490-9931-6cc92676b305', 'af9b7a29-8c44-4dbe-baa0-c29eb1760d96'],
    },
    'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420': {
      id: 'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420',
      nestedDepth: 0,
      isMultiField: false,
      path: ['multifield'],
      source: {
        name: 'multifield',
        type: 'object',
      },
      childFieldsName: 'properties',
      canHaveChildFields: true,
      hasChildFields: true,
      canHaveMultiFields: false,
      hasMultiFields: false,
      isExpanded: false,
      childFields: ['4459e8f2-3bec-4d17-b50c-f62d1fcbcca0', '9031c735-a445-491f-948d-41989b51a1a3'],
    },
    '54204b52-c6a0-4de4-8f82-3e1ea9ad533a': {
      id: '54204b52-c6a0-4de4-8f82-3e1ea9ad533a',
      nestedDepth: 0,
      isMultiField: false,
      path: ['title'],
      source: {
        name: 'title',
        type: 'text',
      },
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
  },
  aliases: {},
  rootLevelFields: ['dd0dd3aa-52c9-472b-a23d-ecec0a1b2420', '54204b52-c6a0-4de4-8f82-3e1ea9ad533a'],
  maxNestedDepth: 3,
};

describe('utils', () => {
  describe('stripUndefinedValues()', () => {
    test('should remove all undefined value recursively', () => {
      const myDate = new Date();

      const dataIN = {
        someString: 'world',
        someNumber: 123,
        someBoolean: true,
        someArray: [1, 2, 3],
        someEmptyObject: {},
        someDate: myDate,
        falsey1: 0,
        falsey2: '',
        stripThis: undefined,
        nested: {
          value: 'bar',
          stripThis: undefined,
          deepNested: {
            value: 'baz',
            stripThis: undefined,
          },
        },
      };

      const dataOUT = {
        someString: 'world',
        someNumber: 123,
        someBoolean: true,
        someArray: [1, 2, 3],
        someEmptyObject: {},
        someDate: myDate,
        falsey1: 0,
        falsey2: '',
        nested: {
          value: 'bar',
          deepNested: {
            value: 'baz',
          },
        },
      };

      expect(stripUndefinedValues(dataIN)).toEqual(dataOUT);
    });
  });

  describe('getTypeLabelFromField()', () => {
    test('returns label for fields', () => {
      expect(
        getTypeLabelFromField({
          type: 'keyword',
        })
      ).toBe('Keyword');
    });

    test(`returns a label prepended with 'Other' for unrecognized fields`, () => {
      expect(
        getTypeLabelFromField({
          name: 'testField',
          // @ts-ignore
          type: 'hyperdrive',
        })
      ).toBe('Other: hyperdrive');
    });
  });

  describe('getFieldMeta', () => {
    test('returns "canHaveMultiFields:true" for text data type', () => {
      expect(getFieldMeta({ name: 'text_field', type: 'text' }).canHaveMultiFields).toEqual(true);
    });
    test('returns "canHaveMultiFields:true" for keyword data type', () => {
      expect(getFieldMeta({ name: 'keyword_field', type: 'keyword' }).canHaveMultiFields).toEqual(
        true
      );
    });
    test('returns "canHaveMultiFields:true" for IP data type', () => {
      expect(getFieldMeta({ name: 'ip_field', type: 'ip' }).canHaveMultiFields).toEqual(true);
    });
    test('returns "canHaveMultiFields:true" for wildcard data type', () => {
      expect(getFieldMeta({ name: 'wildcard_field', type: 'wildcard' }).canHaveMultiFields).toEqual(
        true
      );
    });
    test('returns "canHaveMultiFields:false" for flattened data type', () => {
      expect(
        getFieldMeta({ name: 'flattened_field', type: 'flattened' }).canHaveMultiFields
      ).toEqual(false);
    });
  });
  describe('getFieldsFromState', () => {
    test('returns all the fields', () => {
      expect(getFieldsFromState(fieldsWithnestedFields)).toEqual([
        {
          id: 'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420',
          nestedDepth: 0,
          isMultiField: false,
          path: ['multifield'],
          source: {
            name: 'multifield',
            type: 'object',
          },
          childFieldsName: 'properties',
          canHaveChildFields: true,
          hasChildFields: true,
          canHaveMultiFields: false,
          hasMultiFields: false,
          isExpanded: false,
          childFields: [
            '4459e8f2-3bec-4d17-b50c-f62d1fcbcca0',
            '9031c735-a445-491f-948d-41989b51a1a3',
          ],
        },
        {
          id: '54204b52-c6a0-4de4-8f82-3e1ea9ad533a',
          nestedDepth: 0,
          isMultiField: false,
          path: ['title'],
          source: {
            name: 'title',
            type: 'text',
          },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
      ]);
    });
    test('returns only text fields matching filter', () => {
      expect(getFieldsFromState(fieldsWithnestedFields, ['Text'])).toEqual([
        {
          id: 'af9b7a29-8c44-4dbe-baa0-c29eb1760d96',
          parentId: '9031c735-a445-491f-948d-41989b51a1a3',
          nestedDepth: 2,
          isMultiField: false,
          path: ['multifield', 'points', 'name'],
          source: {
            name: 'name',
            type: 'text',
          },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
        {
          id: '54204b52-c6a0-4de4-8f82-3e1ea9ad533a',
          nestedDepth: 0,
          isMultiField: false,
          path: ['title'],
          source: {
            name: 'title',
            type: 'text',
          },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
      ]);
    });
  });
  describe('getallFieldsIncludingNestedFields', () => {
    const fields: Fields = {
      nested_field: {
        properties: {
          flag: { type: 'boolean' },
          points: {
            properties: {
              name: { type: 'text' },
              entity: {
                type: 'object',
                properties: {
                  entity_1: { type: 'keyword' },
                },
              },
            },
            type: 'object',
          },
        },
        type: 'object',
      },
    };
    test('returns all the data types including nested fields types', () => {
      expect(getAllFieldTypesFromState(fields)).toEqual(['object', 'boolean', 'text', 'keyword']);
    });
  });

  describe('getFieldsMatchingFilterFromState', () => {
    const sampleState: State = {
      isValid: true,
      configuration: {
        defaultValue: {},
        data: {
          internal: {},
          format: () => ({}),
        },
        validate: () => Promise.resolve(true),
      },
      templates: {
        defaultValue: {},
        data: {
          internal: {},
          format: () => ({}),
        },
        validate: () => Promise.resolve(true),
      },
      fields: fieldsWithnestedFields,
      documentFields: {
        status: 'disabled',
        editor: 'default',
      },
      runtimeFields: {},
      runtimeFieldsList: {
        status: 'idle',
      },
      fieldsJsonEditor: {
        format: () => ({}),
        isValid: true,
      },
      search: {
        term: 'f',
        result: [],
      },
      filter: {
        filteredFields: [
          {
            id: 'eb903187-c99e-4773-9274-cbefc68bb3f1',
            parentId: '5c6287de-7ed0-48f8-bc08-c401bcc26e40',
            nestedDepth: 1,
            isMultiField: false,
            path: ['multifield', 'flag'],
            source: {
              name: 'flag',
              type: 'boolean',
            },
            childFieldsName: 'fields',
            canHaveChildFields: false,
            hasChildFields: false,
            canHaveMultiFields: true,
            hasMultiFields: false,
            isExpanded: false,
          },
        ],
        selectedOptions: [
          {
            label: 'Object',
            'data-test-subj': 'indexDetailsMappingsSelectFilter-object',
          },
          {
            checked: 'on',
            label: 'Boolean',
            'data-test-subj': 'indexDetailsMappingsSelectFilter-boolean',
          },
          {
            label: 'Keyword',
            'data-test-subj': 'indexDetailsMappingsSelectFilter-keyword',
          },
          {
            label: 'Text',
            'data-test-subj': 'indexDetailsMappingsSelectFilter-text',
          },
        ],
        selectedDataTypes: ['Boolean'],
      },
      inferenceToModelIdMap: {},
      mappingViewFields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
    };
    test('returns list of matching fields with search term', () => {
      expect(getFieldsMatchingFilterFromState(sampleState, ['Boolean'])).toEqual({
        '4459e8f2-3bec-4d17-b50c-f62d1fcbcca0': {
          id: '4459e8f2-3bec-4d17-b50c-f62d1fcbcca0',
          parentId: 'dd0dd3aa-52c9-472b-a23d-ecec0a1b2420',
          nestedDepth: 1,
          isMultiField: false,
          path: ['multifield', 'flag'],
          source: {
            name: 'flag',
            type: 'boolean',
          },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
      });
    });
    describe('getStateWithCopyToFields', () => {
      test('returns state if there is no semantic text field', () => {
        const state = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                source: {
                  name: 'title',
                  type: 'text',
                },
              },
            },
          },
        } as any;
        expect(getStateWithCopyToFields(state)).toEqual(state);
      });
      test('returns state if semantic text field has no reference field', () => {
        const state = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                source: {
                  name: 'title',
                  type: 'semantic_text',
                  inference_id: 'id',
                },
              },
            },
          },
        } as any;
        expect(getStateWithCopyToFields(state)).toEqual(state);
      });
      test('adds text field with copy to to state if semantic text field has reference field', () => {
        const state = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                path: ['title'],
                source: {
                  name: 'title',
                  type: 'semantic_text',
                  inference_id: 'id',
                  reference_field: 'new',
                },
              },
              'new-field': {
                id: 'new-field',
                isMultiField: false,
                path: ['new'],
                source: {
                  name: 'new',
                  type: 'text',
                },
              },
            },
            rootLevelFields: ['88ebcfdb-19b7-4458-9ea2-9488df54453d'],
          },
        } as any;
        const expectedState = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                path: ['title'],
                source: {
                  name: 'title',
                  type: 'semantic_text',
                  inference_id: 'id',
                },
              },
              'new-field': {
                id: 'new-field',
                isMultiField: false,
                path: ['new'],
                source: {
                  name: 'new',
                  type: 'text',
                  copy_to: ['title'],
                },
              },
            },
            rootLevelFields: ['88ebcfdb-19b7-4458-9ea2-9488df54453d', 'new-field'],
          },
        } as any;
        expect(getStateWithCopyToFields(state)).toEqual(expectedState);
      });
      test('adds nested text field with copy to to state if semantic text field has reference field', () => {
        const state = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                path: ['title'],
                source: {
                  name: 'title',
                  type: 'semantic_text',
                  inference_id: 'id',
                  reference_field: 'existing.new',
                },
              },
            },
            rootLevelFields: ['88ebcfdb-19b7-4458-9ea2-9488df54453d'],
          },
          mappingViewFields: {
            byId: {
              existing: {
                id: 'existing',
                isMultiField: false,
                path: ['existing'],
                source: {
                  name: 'existing',
                  type: 'object',
                },
              },
              'new-field': {
                id: 'new-field',
                parentId: 'existing',
                isMultiField: false,
                path: ['existing', 'new'],
                source: {
                  name: 'new',
                  type: 'text',
                },
              },
            },
          },
        } as any;
        const expectedState = {
          fields: {
            byId: {
              '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
                id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
                isMultiField: false,
                path: ['title'],
                source: {
                  name: 'title',
                  type: 'semantic_text',
                  inference_id: 'id',
                },
              },
              existing: {
                id: 'existing',
                isMultiField: false,
                path: ['existing'],
                source: {
                  name: 'existing',
                  type: 'object',
                },
              },
              'new-field': {
                id: 'new-field',
                isMultiField: false,
                parentId: 'existing',
                path: ['existing', 'new'],
                source: {
                  name: 'new',
                  type: 'text',
                  copy_to: ['title'],
                },
              },
            },
            rootLevelFields: ['88ebcfdb-19b7-4458-9ea2-9488df54453d', 'existing'],
          },
          mappingViewFields: {
            byId: {
              existing: {
                id: 'existing',
                isMultiField: false,
                path: ['existing'],
                source: {
                  name: 'existing',
                  type: 'object',
                },
              },
              'new-field': {
                id: 'new-field',
                parentId: 'existing',
                isMultiField: false,
                path: ['existing', 'new'],
                source: {
                  name: 'new',
                  type: 'text',
                },
              },
            },
          },
        } as any;
        expect(getStateWithCopyToFields(state)).toEqual(expectedState);
      });
    });
  });
});
