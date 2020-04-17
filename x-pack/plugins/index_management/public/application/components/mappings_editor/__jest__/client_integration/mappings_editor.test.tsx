/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, nextTick, getRandomString } from './helpers';

const { setup } = componentHelpers.mappingsEditor;
const onUpdateHandler = jest.fn();

const getDataForwarded = async () => {
  const mockCalls = onUpdateHandler.mock.calls;

  if (mockCalls.length === 0) {
    throw new Error(
      `Can't access data forwarded as the onUpdate() prop handler hasn't been called.`
    );
  }

  const [arg] = mockCalls[mockCalls.length - 1];
  const { isValid, validate, getData } = arg;

  let isMappingsValid: boolean = false;
  let data: any;

  await act(async () => {
    isMappingsValid = isValid === undefined ? await validate() : isValid;
    data = getData(isMappingsValid);
  });

  return {
    isValid: isMappingsValid,
    data,
  };
};

const expectDataUpdated = async (expected: any) => {
  const { data } = await getDataForwarded();
  expect(data).toEqual(expected);
};

describe('<MappingsEditor />', () => {
  afterEach(() => {
    onUpdateHandler.mockReset();
  });

  describe('multiple mappings detection', () => {
    test('should show a warning when multiple mappings are detected', async () => {
      const defaultValue = {
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
      const testBed = await setup({ onUpdate: onUpdateHandler, defaultValue });
      const { exists } = testBed;

      expect(exists('mappingsEditor')).toBe(true);
      expect(exists('mappingTypesDetectedCallout')).toBe(true);
      expect(exists('documentFields')).toBe(false);
    });

    test('should not show a warning when mappings a single-type', async () => {
      const defaultValue = {
        properties: {
          name1: {
            type: 'keyword',
          },
        },
      };
      const testBed = await setup({ onUpdate: onUpdateHandler, defaultValue });
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
      testBed = await setup({ defaultValue: defaultMappings, onUpdate() {} });
    });

    test('should keep the changes when switching tabs', async () => {
      const {
        actions: { addField, selectTab, updateJsonEditor, getJsonEditorValue },
        component,
        find,
        exists,
        form,
      } = testBed;

      // -------------------------------------
      // Document fields Tab: add a new field
      // -------------------------------------
      expect(find('fieldsListItem').length).toEqual(0); // Check that we start with an empty  list

      const newField = { name: getRandomString(), type: 'text' };
      await act(async () => {
        await addField(newField.name, newField.type);
      });

      expect(find('fieldsListItem').length).toEqual(1);

      let field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // -------------------------------------
      // Navigate to dynamic templates tab
      // -------------------------------------
      await act(async () => {
        await selectTab('templates');
      });

      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      // Update the dynamic templates editor value
      const updatedValueTemplates = [{ after: 'bar' }];
      await act(async () => {
        await updateJsonEditor('dynamicTemplatesEditor', updatedValueTemplates);
        await nextTick();
        component.update();
      });

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // ------------------------------------------------------
      // Switch to advanced settings tab and make some changes
      // ------------------------------------------------------
      await act(async () => {
        await selectTab('advanced');
      });

      let isDynamicMappingsEnabled = find(
        'advancedConfiguration.dynamicMappingsToggle.input'
      ).props()['aria-checked'];
      expect(isDynamicMappingsEnabled).toBe(true);

      let isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(true);

      // Turn off dynamic mappings
      await act(async () => {
        form.toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');
        await nextTick();
        component.update();
        await nextTick();
      });

      isDynamicMappingsEnabled = find('advancedConfiguration.dynamicMappingsToggle.input').props()[
        'aria-checked'
      ];
      expect(isDynamicMappingsEnabled).toBe(false);

      isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(false);

      // ----------------------------------------------------------------------------
      // Go back to dynamic templates tab and make sure our changes are still there
      // ----------------------------------------------------------------------------
      await act(async () => {
        await selectTab('templates');
      });

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // -----------------------------------------------------------
      // Go back to fields and make sure our created field is there
      // -----------------------------------------------------------
      await act(async () => {
        await selectTab('fields');
      });
      field = find('fieldsListItem').at(0);
      expect(find('fieldName', field).text()).toEqual(newField.name);

      // Go back to advanced settings tab make sure dynamic mappings is disabled
      await act(async () => {
        await selectTab('advanced');
      });

      isDynamicMappingsEnabled = find('advancedConfiguration.dynamicMappingsToggle.input').props()[
        'aria-checked'
      ];
      expect(isDynamicMappingsEnabled).toBe(false);
      isNumericDetectionVisible = exists('advancedConfiguration.numericDetection');
      expect(isNumericDetectionVisible).toBe(false);
    });
  });

  describe('component props', () => {
    /**
     * Note: the "indexSettings" prop will be tested along with the "analyzer" parameter on a field,
     * as it is the only place where it is consumed by the mappings editor.
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
      testBed = await setup({ defaultValue: defaultMappings, onUpdate: onUpdateHandler });
    });

    test('props.defaultValue => should prepopulate the editor data', async () => {
      const {
        actions: { selectTab, getJsonEditorValue, getComboBoxValue },
        find,
      } = testBed;

      /**
       * Mapped fields
       */
      expect(find('fieldsListItem').length).toEqual(Object.keys(defaultMappings.properties).length);

      const fields = find('fieldsListItem.fieldName').map(item => item.text());
      expect(fields).toEqual(Object.keys(defaultMappings.properties).sort());

      /**
       * Dynamic templates
       */
      await act(async () => {
        await selectTab('templates');
      });

      const templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      /**
       * Advanced settings
       */
      await act(async () => {
        await selectTab('advanced');
      });

      const isDynamicMappingsEnabled = find(
        'advancedConfiguration.dynamicMappingsToggle.input'
      ).props()['aria-checked'];
      expect(isDynamicMappingsEnabled).toBe(defaultMappings.dynamic);

      const isNumericDetectionEnabled = find(
        'advancedConfiguration.numericDetection.input'
      ).props()['aria-checked'];
      expect(isNumericDetectionEnabled).toBe(defaultMappings.numeric_detection);

      expect(getComboBoxValue('sourceField.includesField')).toEqual(
        defaultMappings._source.includes
      );
      expect(getComboBoxValue('sourceField.excludesField')).toEqual(
        defaultMappings._source.excludes
      );

      const metaFieldValue = getJsonEditorValue('advancedConfiguration.metaField');
      expect(metaFieldValue).toEqual(defaultMappings._meta);

      const isRoutingRequired = find('advancedConfiguration.routingRequiredToggle.input').props()[
        'aria-checked'
      ];
      expect(isRoutingRequired).toBe(defaultMappings._routing.required);
    });

    test('props.onUpdate() => should forward the changes to the consumer component', async () => {
      let updatedMappings = { ...defaultMappings };

      const {
        actions: { addField, selectTab, updateJsonEditor },
        component,
        form,
      } = testBed;

      /**
       * Mapped fields
       */
      const newField = { name: getRandomString(), type: 'text' };
      updatedMappings = {
        ...updatedMappings,
        properties: {
          ...updatedMappings.properties,
          [newField.name]: { type: 'text' },
        },
      };

      await act(async () => {
        await addField(newField.name, newField.type);
      });
      await expectDataUpdated(updatedMappings);

      /**
       * Dynamic templates
       */
      await act(async () => {
        await selectTab('templates');
      });

      const updatedTemplatesValue = [{ someTemplateProp: 'updated' }];
      updatedMappings = {
        ...updatedMappings,
        dynamic_templates: updatedTemplatesValue,
      };

      await act(async () => {
        await updateJsonEditor('dynamicTemplatesEditor', updatedTemplatesValue);
        await nextTick();
        component.update();
      });
      await expectDataUpdated(updatedMappings);

      /**
       * Advanced settings
       */
      await act(async () => {
        await selectTab('advanced');
      });

      // Disbable dynamic mappings
      await act(async () => {
        form.toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');
      });

      // When we disable dynamic mappings, we set it to "strict" and remove date and numeric detections
      updatedMappings = {
        ...updatedMappings,
        dynamic: false,
        date_detection: undefined,
        dynamic_date_formats: undefined,
        numeric_detection: undefined,
      };

      await expectDataUpdated(updatedMappings);
    });
  });
});
