/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);

// FLAKY: https://github.com/elastic/kibana/issues/66457
describe.skip('Mappings editor: core', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    onChangeHandler.mockReset();
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

    const { component } = setup({ value: defaultMappings, onChange: onChangeHandler });

    const expectedMappings = {
      _meta: {}, // Was not defined so an empty object is returned
      _source: {}, // Was not defined so an empty object is returned
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
      const testBed = setup({ onChange: onChangeHandler, value });
      const { exists } = testBed;

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
      const testBed = setup({ onChange: onChangeHandler, value });
      const { exists } = testBed;

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
    let testBed: MappingsEditorTestBed;

    beforeEach(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
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
      await act(async () => {
        addField(newField.name, newField.type);
      });
      component.update();

      expect(find('fieldsListItem').length).toEqual(1);

      let field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // -------------------------------------
      // Navigate to dynamic templates tab
      // -------------------------------------
      await act(async () => {
        selectTab('templates');
      });
      component.update();

      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      // Update the dynamic templates editor value
      const updatedValueTemplates = [{ after: 'bar' }];
      await act(async () => {
        updateJsonEditor('dynamicTemplatesEditor', updatedValueTemplates);
      });
      component.update();

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // ------------------------------------------------------
      // Switch to advanced settings tab and make some changes
      // ------------------------------------------------------
      await act(async () => {
        selectTab('advanced');
      });
      component.update();

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

      // await act(() => promise);
      // ----------------------------------------------------------------------------
      // Go back to dynamic templates tab and make sure our changes are still there
      // ----------------------------------------------------------------------------
      await act(async () => {
        selectTab('templates');
      });
      component.update();

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // -----------------------------------------------------------
      // Go back to fields and make sure our created field is there
      // -----------------------------------------------------------
      await act(async () => {
        selectTab('fields');
      });
      component.update();
      field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // Go back to advanced settings tab make sure dynamic mappings is disabled
      await act(async () => {
        selectTab('advanced');
      });
      component.update();

      isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(false);
      isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(false);
    });
  });

  describe('component props', () => {
    /**
     * Note: the "indexSettings" prop will be tested along with the "analyzer" parameter on a text datatype field,
     * as it is the only place where it is consumed by the mappings editor.
     *
     * The test that covers it is text_datatype.test.tsx: "analyzer parameter: custom analyzer (from index settings)"
     */
    const defaultMappings: any = {
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
    };

    let testBed: MappingsEditorTestBed;

    beforeEach(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });

    test('props.value => should prepopulate the editor data', async () => {
      const {
        component,
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
      await act(async () => {
        selectTab('templates');
      });
      component.update();

      // Test that dynamic templates JSON is rendered in the templates editor
      const templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      /**
       * Advanced settings
       */
      await act(async () => {
        selectTab('advanced');
      });
      component.update();

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
      const newField = { name: 'someNewField', type: 'text' };
      updatedMappings = {
        ...updatedMappings,
        properties: {
          ...updatedMappings.properties,
          [newField.name]: { type: 'text' },
        },
      };

      await act(async () => {
        find('addFieldButton').simulate('click');
      });
      component.update();

      await act(async () => {
        addField(newField.name, newField.type);
      });
      component.update();

      ({ data } = await getMappingsEditorData(component));
      expect(data).toEqual(updatedMappings);

      /**
       * Dynamic templates
       */
      await act(async () => {
        await selectTab('templates');
      });
      component.update();

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
      await act(async () => {
        selectTab('advanced');
      });
      component.update();

      // Disbable dynamic mappings
      await act(async () => {
        form.toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');
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
});
