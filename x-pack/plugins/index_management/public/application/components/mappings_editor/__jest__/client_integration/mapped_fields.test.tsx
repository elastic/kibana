/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, DomFields } from './helpers';

const { setup } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();

describe('Mapped fields', () => {
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
      await act(async () => {
        testBed = await setup({
          value: defaultMappings,
          onChange: onChangeHandler,
        });
      });

      const {
        actions: { expandAllFieldsAndReturnMetadata },
      } = testBed;

      let domTreeMetadata: DomFields = {};
      await act(async () => {
        domTreeMetadata = await expandAllFieldsAndReturnMetadata();
      });

      expect(domTreeMetadata).toEqual(defaultMappings.properties);
    });
  });
});
