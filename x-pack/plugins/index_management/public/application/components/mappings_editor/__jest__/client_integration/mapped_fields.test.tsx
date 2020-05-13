/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, DomFields, nextTick } from './helpers';

const { setup } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();

// FLAKY: https://github.com/elastic/kibana/issues/65741
describe.skip('Mappings editor: mapped fields', () => {
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

    test('should allow to be controlled by parent component and update on prop change', async () => {
      await act(async () => {
        testBed = await setup({
          value: defaultMappings,
          onChange: onChangeHandler,
        });
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

        // Don't ask me why but the 3 following lines are all required
        component.update();
        await nextTick();
        component.update();

        domTreeMetadata = await expandAllFieldsAndReturnMetadata();
      });

      expect(domTreeMetadata).toEqual(newMappings.properties);
    });
  });
});
