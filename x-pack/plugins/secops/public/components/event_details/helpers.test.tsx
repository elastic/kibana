/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { getPopulatedMappedFields, virtualEcsSchema } from '../../../public/lib/ecs';
import { mockEcsData } from '../../mock/mock_ecs';
import { createStore } from '../../store';
import { getExampleText, getIconFromType, getItems } from './helpers';

const aField = virtualEcsSchema.event.fields['event.category'];

describe('helpers', () => {
  describe('getExampleText', () => {
    test('it returns the expected example text when the field contains an example', () => {
      expect(getExampleText(aField)).toEqual('Example: user-management');
    });

    test(`it returns an empty string when the field's example is an empty string`, () => {
      const fieldWithEmptyExample = {
        ...aField,
        example: '',
      };

      expect(getExampleText(fieldWithEmptyExample)).toEqual('');
    });
  });

  describe('getIconFromType', () => {
    [
      {
        type: 'keyword',
        expected: 'string',
      },
      {
        type: 'long',
        expected: 'number',
      },
      {
        type: 'date',
        expected: 'clock',
      },
      {
        type: 'ip',
        expected: 'globe',
      },
      {
        type: 'object',
        expected: 'questionInCircle',
      },
      {
        type: 'float',
        expected: 'number',
      },
      {
        type: 'anything else',
        expected: 'questionInCircle',
      },
    ].forEach(({ type, expected }) => {
      test(`it returns a ${expected} icon for type ${type}`, () =>
        expect(getIconFromType(type)).toEqual(expected));
    });
  });

  describe('getItems', () => {
    const data = mockEcsData[0];

    test('it returns the expected number of populated fields', () => {
      expect(
        getItems({
          data,
          populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
        }).length
      ).toEqual(17);
    });

    test('it includes the "event.category" field', () => {
      getItems({
        data,
        populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
      }).some(x => x.field === 'event.category');
    });

    test('it returns the expected description', () => {
      expect(
        getItems({
          data,
          populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
        }).find(x => x.field === 'event.category')!.description
      ).toEqual(
        'Event category.\nThis contains high-level information about the contents of the event. It is more generic than `event.action`, in the sense that typically a category contains multiple actions. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution. Example: user-management'
      );
    });

    test('it returns the expected type', () => {
      expect(
        getItems({
          data,
          populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
        }).find(x => x.field === 'event.category')!.type
      ).toEqual('keyword');
    });

    test('it returns the expected valueAsString', () => {
      expect(
        getItems({
          data,
          populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
        }).find(x => x.field === 'event.category')!.valueAsString
      ).toEqual('Access');
    });

    test('it returns a draggable wrapper with the expected value.key', () => {
      expect(
        getItems({
          data,
          populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
        }).find(x => x.field === 'event.category')!.value.key
      ).toMatch(/^event-field-browser-value-for-event.category-\S+$/);
    });

    describe('formatting data for display', () => {
      let store = createStore();

      beforeEach(() => {
        store = createStore();
      });

      const justDateFields = getItems({
        data,
        populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
      }).filter(item => item.type === 'date');

      const nonDateFields = getItems({
        data,
        populatedFields: getPopulatedMappedFields({ data, schema: virtualEcsSchema }),
      }).filter(item => item.type !== 'date');

      test('it should have at least one date field (a sanity check for inputs to other tests)', () => {
        expect(justDateFields.length > 0).toEqual(true); // to ensure the tests below run for at least one date field
      });

      test('it should have at least one NON-date field (a sanity check for inputs to other tests)', () => {
        expect(nonDateFields.length > 0).toEqual(true); // to ensure the tests below run for at least one NON-date field
      });

      justDateFields.forEach(field => {
        test(`it should render a tooltip for the ${field.field} (${field.type}) field`, () => {
          const wrapper = mount(
            <ReduxStoreProvider store={store}>
              <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
                <DragDropContext onDragEnd={noop}>
                  <>{field.value}</>
                </DragDropContext>
              </ThemeProvider>
            </ReduxStoreProvider>
          );

          expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(true);
        });
      });

      nonDateFields.forEach(field => {
        test(`it should NOT render a tooltip for the NON-date ${field.field} (${
          field.type
        }) field`, () => {
          const wrapper = mount(
            <ReduxStoreProvider store={store}>
              <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
                <DragDropContext onDragEnd={noop}>
                  <>{field.value}</>
                </DragDropContext>
              </ThemeProvider>
            </ReduxStoreProvider>
          );

          expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(
            false
          );
        });
      });
    });
  });
});
