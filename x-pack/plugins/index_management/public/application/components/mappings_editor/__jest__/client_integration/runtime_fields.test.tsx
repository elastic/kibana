/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

describe('Mappings editor: runtime fields', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let onChangeHandler: jest.Mock = jest.fn();
  let getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    onChangeHandler = jest.fn();
    getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
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
        expect(find('createRuntimeFieldButton').text()).toBe('Create runtime field');

        expect(exists('runtimeFieldEditor')).toBe(false);
        actions.openRuntimeFieldEditor();
        expect(exists('runtimeFieldEditor')).toBe(true);
      });
    });

    describe('when there are runtime fields', () => {
      const defaultMappings = {
        runtime: {
          day_of_week: {
            type: 'date',
            script: {
              source: 'emit("hello Kibana")',
            },
          },
        },
      };

      beforeEach(async () => {
        testBed = setup({
          value: defaultMappings,
          onChange: onChangeHandler,
        });

        await testBed.actions.selectTab('runtimeFields');
      });

      test('should list the fields', async () => {
        const { find, actions } = testBed;

        const fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(1);

        const [field] = fields;
        expect(field.name).toBe('day_of_week');
        expect(field.type).toBe('Date');

        await actions.startEditRuntimeField('day_of_week');
        expect(find('runtimeFieldEditor.scriptField').props().value).toBe('emit("hello Kibana")');
      });

      test('should have a button to create fields', () => {
        const { actions, exists } = testBed;

        expect(exists('createRuntimeFieldButton')).toBe(true);

        actions.openRuntimeFieldEditor();
        expect(exists('runtimeFieldEditor')).toBe(true);
      });

      test('should close the runtime editor when switching tab', async () => {
        const { exists, actions } = testBed;
        expect(exists('runtimeFieldEditor')).toBe(false); // closed

        actions.openRuntimeFieldEditor();
        expect(exists('runtimeFieldEditor')).toBe(true); // opened

        // Navigate away
        await testBed.actions.selectTab('templates');
        expect(exists('runtimeFieldEditor')).toBe(false); // closed

        // Back to runtime fields
        await testBed.actions.selectTab('runtimeFields');
        expect(exists('runtimeFieldEditor')).toBe(false); // still closed
      });
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
        const { exists, actions, component } = testBed;

        await actions.addRuntimeField({
          name: 'myField',
          script: { source: 'emit("hello")' },
          type: 'boolean',
        });

        // Make sure editor is closed and the field is in the list
        expect(exists('runtimeFieldEditor')).toBe(false);
        expect(exists('emptyList')).toBe(false);

        const fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(1);

        const [field] = fields;
        expect(field.name).toBe('myField');
        expect(field.type).toBe('Boolean');

        // Make sure the field has been added to forwarded data
        ({ data } = await getMappingsEditorData(component));

        expect(data).toEqual({
          runtime: {
            myField: {
              type: 'boolean',
              script: {
                source: 'emit("hello")',
              },
            },
          },
        });
      });

      test('should remove the runtime field from the list', async () => {
        const { actions, component } = testBed;

        await actions.addRuntimeField({
          name: 'myField',
          script: { source: 'emit("hello")' },
          type: 'boolean',
        });

        let fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(1);
        ({ data } = await getMappingsEditorData(component));
        expect(data).toBeDefined();
        expect(data.runtime).toBeDefined();

        await actions.deleteRuntimeField('myField');

        fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(0);

        ({ data } = await getMappingsEditorData(component));

        expect(data).toBeUndefined();
      });

      test('should edit the runtime field', async () => {
        const { find, component, actions } = testBed;

        await actions.addRuntimeField({
          name: 'myField',
          script: { source: 'emit("hello")' },
          type: 'boolean',
        });

        let fields = actions.getRuntimeFieldsList();
        expect(fields.length).toBe(1);

        await actions.startEditRuntimeField('myField');
        await actions.updateRuntimeFieldForm({
          name: 'updatedName',
          script: { source: 'new script' },
          type: 'date',
        });

        await act(async () => {
          find('runtimeFieldEditor.saveFieldButton').simulate('click');
          jest.advanceTimersByTime(0); // advance timers to allow the form to validate
        });
        component.update();

        fields = actions.getRuntimeFieldsList();
        const [field] = fields;

        expect(field.name).toBe('updatedName');
        expect(field.type).toBe('Date');

        ({ data } = await getMappingsEditorData(component));

        expect(data).toEqual({
          runtime: {
            updatedName: {
              type: 'date',
              script: {
                source: 'new script',
              },
            },
          },
        });
      });
    });
  });
});
