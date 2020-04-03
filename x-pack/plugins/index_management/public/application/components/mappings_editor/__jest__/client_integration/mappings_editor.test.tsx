/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, nextTick } from './helpers';

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

  describe('dynamic templates', () => {
    const defaultMappings = {
      dynamic_templates: [{ before: 'foo' }],
    };
    let testBed: MappingsEditorTestBed;

    beforeEach(async () => {
      testBed = await setup({ defaultValue: defaultMappings, onUpdate() {} });
    });

    test('should keep the changes made when switching tab', async () => {
      const {
        actions: { selectTab, updateJsonEditor, getJsonEditorValue },
        component,
      } = testBed;

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

      // Switch to advanced settings tab and then come back
      await act(async () => {
        await selectTab('advanced');
        await selectTab('templates');
      });

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);
    });
  });
});
