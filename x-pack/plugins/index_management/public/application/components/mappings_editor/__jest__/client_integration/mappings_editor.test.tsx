/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, nextTick, getRandomString } from './helpers';

const { setup } = componentHelpers.mappingsEditor;
const mockOnUpdate = () => undefined;

describe('<MappingsEditor />', () => {
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
      const testBed = await setup({ onUpdate: mockOnUpdate, defaultValue });
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
      const testBed = await setup({ onUpdate: mockOnUpdate, defaultValue });
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
});
