/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, DomFields } from './helpers';

const { setup } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();

describe('Mappings editor: mapped fields', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    onChangeHandler.mockReset();
  });

  describe('<DocumentFieldsTreeEditor />', () => {
    let testBed: MappingsEditorTestBed;
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
            simpleAnalyzer: {
              type: 'text',
            },
          },
        },
        myObject: {
          type: 'object',
          properties: {
            deeplyNested: {
              type: 'object',
              properties: {
                title: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' },
                  },
                },
              },
            },
          },
        },
      },
    };

    test('should correctly represent the fields in the DOM tree', async () => {
      testBed = setup({
        value: defaultMappings,
        onChange: onChangeHandler,
      });

      const {
        actions: { expandAllFieldsAndReturnMetadata },
      } = testBed;

      const domTreeMetadata = await expandAllFieldsAndReturnMetadata();

      expect(domTreeMetadata).toEqual(defaultMappings.properties);
    });

    test('should allow to be controlled by parent component and update on prop change', async () => {
      testBed = setup({
        value: defaultMappings,
        onChange: onChangeHandler,
      });

      const {
        component,
        setProps,
        actions: { expandAllFieldsAndReturnMetadata },
      } = testBed;

      const newMappings = { properties: { hello: { type: 'text' } } };
      let domTreeMetadata: DomFields = {};

      await act(async () => {
        // Change the `value` prop of our <MappingsEditor />
        setProps({ value: newMappings });
      });
      component.update();

      domTreeMetadata = await expandAllFieldsAndReturnMetadata();

      expect(domTreeMetadata).toEqual(newMappings.properties);
    });
  });
});
