/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

jest.mock('../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

describe('Mappings editor: core', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let onChangeHandler: jest.Mock = jest.fn();
  let getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  let testBed: MappingsEditorTestBed;

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

  test('default behaviour', async () => {
    const defaultMappings = {
      properties: {
        user: {
          // No type defined for user
          properties: {
            name: { type: 'text' },
          },
        },
      },
    };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });

    const { component } = testBed;
    component.update();

    const expectedMappings = {
      ...defaultMappings,
      properties: {
        user: {
          type: 'object', // Was not defined so it defaults to "object" type
          ...defaultMappings.properties.user,
        },
      },
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(expectedMappings);
  });

  describe('multiple mappings detection', () => {
    test('should show a warning when multiple mappings are detected', async () => {
      const value = {
        type1: {
          properties: {
            name1: {
              type: 'keyword',
            },
          },
        },
        type2: {
          properties: {
            name2: {
              type: 'keyword',
            },
          },
        },
      };

      await act(async () => {
        testBed = setup({ onChange: onChangeHandler, value });
      });

      const { component, exists } = testBed;
      component.update();

      expect(exists('mappingsEditor')).toBe(true);
      expect(exists('mappingTypesDetectedCallout')).toBe(true);
      expect(exists('documentFields')).toBe(false);
    });

    test('should not show a warning when mappings a single-type', async () => {
      const value = {
        properties: {
          name1: {
            type: 'keyword',
          },
        },
      };
      await act(async () => {
        testBed = setup({ onChange: onChangeHandler, value });
      });

      const { component, exists } = testBed;
      component.update();

      expect(exists('mappingsEditor')).toBe(true);
      expect(exists('mappingTypesDetectedCallout')).toBe(false);
      expect(exists('documentFields')).toBe(true);
    });
  });

  describe('tabs', () => {
    const defaultMappings = {
      properties: {},
      dynamic_templates: [{ before: 'foo' }],
    };

    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
    };

    beforeEach(async () => {
      await act(async () => {
        testBed = setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
      });
      testBed.component.update();
    });

    test('should have 4 tabs (fields, runtime, template, advanced settings)', () => {
      const { find } = testBed;
      const tabs = find('formTab').map((wrapper) => wrapper.text());

      expect(tabs).toEqual([
        'Mapped fields',
        'Runtime fields',
        'Dynamic templates',
        'Advanced options',
      ]);
    });

    test('should keep the changes when switching tabs', async () => {
      const {
        actions: { addField, selectTab, updateJsonEditor, getJsonEditorValue, getToggleValue },
        component,
        find,
        exists,
        form,
      } = testBed;

      // -------------------------------------
      // Document fields Tab: add a new field
      // -------------------------------------
      expect(find('fieldsListItem').length).toEqual(0); // Check that we start with an empty  list

      const newField = { name: 'John', type: 'text' };
      await addField(newField.name, newField.type);

      expect(find('fieldsListItem').length).toEqual(1);

      let field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // -------------------------------------
      // Navigate to dynamic templates tab
      // -------------------------------------
      await selectTab('templates');

      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      // Update the dynamic templates editor value
      const updatedValueTemplates = [{ after: 'bar' }];
      // await act(async () => {
      updateJsonEditor('dynamicTemplatesEditor', updatedValueTemplates);
      // });
      // component.update();

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // ------------------------------------------------------
      // Switch to advanced settings tab and make some changes
      // ------------------------------------------------------
      await selectTab('advanced');

      let isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(true);

      let isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(true);

      // Turn off dynamic mappings
      await act(async () => {
        form.toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');
      });
      component.update();

      isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(false);

      isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(false);

      // ----------------------------------------------------------------------------
      // Go back to dynamic templates tab and make sure our changes are still there
      // ----------------------------------------------------------------------------
      await selectTab('templates');

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // -----------------------------------------------------------
      // Go back to fields and make sure our created field is there
      // -----------------------------------------------------------
      await selectTab('fields');

      field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // Go back to advanced settings tab make sure dynamic mappings is disabled
      await selectTab('advanced');

      isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(false);
      isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(false);
    });

    test('should keep default dynamic templates value when switching tabs', async () => {
      await act(async () => {
        testBed = setup(
          {
            value: { ...defaultMappings, dynamic_templates: [] }, // by default, the UI will provide an empty array for dynamic templates
            onChange: onChangeHandler,
          },
          ctx
        );
      });
      testBed.component.update();

      const {
        actions: { selectTab, getJsonEditorValue },
      } = testBed;

      // Navigate to dynamic templates tab and verify empty array
      await selectTab('templates');
      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual([]);

      // Navigate to advanced tab
      await selectTab('advanced');

      // Navigate back to dynamic templates tab and verify empty array persists
      await selectTab('templates');
      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual([]);
    });
  });

  describe('component props', () => {
    /**
     * Note: the "indexSettings" prop will be tested along with the "analyzer" parameter on a text datatype field,
     * as it is the only place where it is consumed by the mappings editor.
     * The test that covers it is in the "text_datatype.test.tsx": "analyzer parameter: custom analyzer (from index settings)"
     */
    let defaultMappings: any;

    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
    };

    beforeEach(async () => {
      defaultMappings = {
        dynamic: true,
        numeric_detection: false,
        date_detection: true,
        properties: {
          title: { type: 'text' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'text' },
              city: { type: 'text' },
            },
          },
        },
        dynamic_templates: [{ initial: 'value' }],
        _source: {
          enabled: true,
          includes: ['field1', 'field2'],
          excludes: ['field3'],
        },
        _meta: {
          some: 'metaData',
        },
        _routing: {
          required: false,
        },
        subobjects: true,
      };

      await act(async () => {
        testBed = setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
      });
      testBed.component.update();
    });

    test('props.value => should prepopulate the editor data', async () => {
      const {
        actions: { selectTab, getJsonEditorValue, getComboBoxValue, getToggleValue },
        find,
      } = testBed;

      /**
       * Mapped fields
       */
      // Test that root-level mappings "properties" are rendered as root-level "DOM tree items"
      const fields = find('fieldsListItem.fieldName').map((item) => item.text());
      expect(fields).toEqual(Object.keys(defaultMappings.properties).sort());

      /**
       * Dynamic templates
       */
      await selectTab('templates');

      // Test that dynamic templates JSON is rendered in the templates editor
      const templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      /**
       * Advanced settings
       */
      await selectTab('advanced');

      const isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(defaultMappings.dynamic);

      const isNumericDetectionEnabled = getToggleValue(
        'advancedConfiguration.numericDetection.input'
      );
      expect(isNumericDetectionEnabled).toBe(defaultMappings.numeric_detection);

      expect(getComboBoxValue('sourceField.includesField')).toEqual(
        defaultMappings._source.includes
      );
      expect(getComboBoxValue('sourceField.excludesField')).toEqual(
        defaultMappings._source.excludes
      );

      const metaFieldValue = getJsonEditorValue('advancedConfiguration.metaField');
      expect(metaFieldValue).toEqual(defaultMappings._meta);

      const isRoutingRequired = getToggleValue('advancedConfiguration.routingRequiredToggle.input');
      expect(isRoutingRequired).toBe(defaultMappings._routing.required);
    });

    test('props.onChange() => should forward the changes to the consumer component', async () => {
      let updatedMappings = { ...defaultMappings };

      const {
        find,
        actions: { addField, selectTab, updateJsonEditor },
        component,
        form,
      } = testBed;

      /**
       * Mapped fields
       */
      await act(async () => {
        find('addFieldButton').simulate('click');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();

      const newField = { name: 'someNewField', type: 'text' };
      await addField(newField.name, newField.type);

      updatedMappings = {
        ...updatedMappings,
        properties: {
          ...updatedMappings.properties,
          [newField.name]: { type: 'text' },
        },
      };

      ({ data } = await getMappingsEditorData(component));

      expect(data).toEqual(updatedMappings);

      /**
       * Dynamic templates
       */
      await selectTab('templates');

      const updatedTemplatesValue = [{ someTemplateProp: 'updated' }];
      updatedMappings = {
        ...updatedMappings,
        dynamic_templates: updatedTemplatesValue,
      };

      await act(async () => {
        updateJsonEditor('dynamicTemplatesEditor', updatedTemplatesValue);
      });

      ({ data } = await getMappingsEditorData(component));
      expect(data).toEqual(updatedMappings);

      /**
       * Advanced settings
       */
      await selectTab('advanced');

      // Disbable dynamic mappings
      await act(async () => {
        form.toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });

      ({ data } = await getMappingsEditorData(component));

      // When we disable dynamic mappings, we set it to "false" and remove date and numeric detections
      updatedMappings = {
        ...updatedMappings,
        dynamic: false,
      };
      delete updatedMappings.date_detection;
      delete updatedMappings.dynamic_date_formats;
      delete updatedMappings.numeric_detection;

      expect(data).toEqual(updatedMappings);
    });
  });

  describe('multi-fields support', () => {
    it('allows multi-fields for most types', async () => {
      const value = {
        properties: {
          name1: {
            type: 'wildcard',
          },
        },
      };
      await act(async () => {
        testBed = setup({ onChange: onChangeHandler, value });
      });

      const { component, exists } = testBed;
      component.update();
      expect(exists('addMultiFieldButton')).toBe(true);
    });

    it('keeps the fields property in the field', async () => {
      const value = {
        properties: {
          name1: {
            type: 'wildcard',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
        },
      };
      await act(async () => {
        testBed = setup({ onChange: onChangeHandler, value });
      });

      const { component } = testBed;
      component.update();
      ({ data } = await getMappingsEditorData(component));
      expect(data).toEqual(value);
    });
  });
});
