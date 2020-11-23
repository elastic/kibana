/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';

const { setup } = componentHelpers.mappingsEditor;

describe('Mappings editor: runtime fields', () => {
  let onChangeHandler = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    onChangeHandler = jest.fn();
  });

  describe('<RuntimeFieldsList />', () => {
    let testBed: MappingsEditorTestBed;

    describe('when there are no runtime fields', () => {
      const defaultMappings = {};

      beforeEach(async () => {
        testBed = setup({
          value: defaultMappings,
          onChange: onChangeHandler,
        });

        await testBed.actions.selectTab('runtimeFields');
      });

      test('should display an empty prompt', () => {
        const { exists, find } = testBed;

        expect(exists('emptyList')).toBe(true);
        expect(find('emptyList').text()).toContain('Start by creating a runtime field');
      });

      test('should have a button to create a field and a link that points to the docs', () => {
        const { exists, find, actions } = testBed;

        expect(exists('emptyList.learnMoreLink')).toBe(true);
        expect(exists('emptyList.createRuntimeFieldButton')).toBe(true);
        expect(find('createRuntimeFieldButton').text()).toBe('Create a runtime field');

        expect(exists('runtimeFieldEditor')).toBe(false);
        actions.createRuntimeField();
        expect(exists('runtimeFieldEditor')).toBe(true);
      });
    });

    describe.skip('when there are runtime fields', () => {
      // const defaultMappings = {
      //   runtime: {
      //     day_of_week: {
      //       type: 'keyword',
      //       script: {
      //         source:
      //           "emit(doc['timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
      //       },
      //     },
      //   },
      // };
      // test('should list the fields', async () => {
      //   testBed = setup({
      //     value: defaultMappings,
      //     onChange: onChangeHandler,
      //   });
      //   const {
      //     actions: { expandAllFieldsAndReturnMetadata },
      //   } = testBed;
      //   const domTreeMetadata = await expandAllFieldsAndReturnMetadata();
      //   expect(domTreeMetadata).toEqual(defaultMappings.properties);
      // });
      // test('should allow to be controlled by parent component and update on prop change', async () => {
      //   testBed = setup({
      //     value: defaultMappings,
      //     onChange: onChangeHandler,
      //   });
      //   const {
      //     component,
      //     setProps,
      //     actions: { expandAllFieldsAndReturnMetadata },
      //   } = testBed;
      //   const newMappings = { properties: { hello: { type: 'text' } } };
      //   let domTreeMetadata: DomFields = {};
      //   await act(async () => {
      //     // Change the `value` prop of our <MappingsEditor />
      //     setProps({ value: newMappings });
      //   });
      //   component.update();
      //   domTreeMetadata = await expandAllFieldsAndReturnMetadata();
      //   expect(domTreeMetadata).toEqual(newMappings.properties);
      // });
    });

    describe('Create / edit / delete runtime fields', () => {
      const defaultMappings = {};

      beforeEach(async () => {
        testBed = setup({
          value: defaultMappings,
          onChange: onChangeHandler,
        });

        await testBed.actions.selectTab('runtimeFields');
      });

      test('should add the runtime field to the list and remove the empty prompt', async () => {
        const { find, exists, form, component, actions } = testBed;

        actions.createRuntimeField();
        act(() => {
          form.setInputValue('runtimeFieldEditor.nameField.input', 'myField');
          form.setInputValue('runtimeFieldEditor.scriptField', 'emit("hello")');
        });

        await act(async () => {
          find('runtimeFieldEditor.saveFieldButton').simulate('click');
        });
        component.update();

        // Make sure editor is closed and the field is in the list
        expect(exists('runtimeFieldEditor')).toBe(false);
        expect(exists('emptyList')).toBe(false);

        const fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(1);

        const [field] = fields;
        expect(field.name).toBe('myField');
        expect(field.type).toBeDefined(); // We don't assert on the default type as it will probably change overtime
      });
    });
  });
});
