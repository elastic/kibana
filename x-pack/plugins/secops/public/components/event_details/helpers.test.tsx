/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import * as React from 'react';

import { TestProviders } from '../../mock';
import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';

import { getExampleText, getIconFromType, getItems } from './helpers';

const aField = mockDetailItemData[0];

describe('helpers', () => {
  describe('getExampleText', () => {
    test('it returns the expected example text when the field contains an example', () => {
      expect(getExampleText(aField)).toEqual('Example: Y-6TfmcB0WOhS6qyMv3s');
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
    test('it returns the expected number of populated fields', () => {
      expect(getItems(mockDetailItemData, mockDetailItemDataId).length).toEqual(20);
    });

    test('it includes the "cloud.instance.id" field', () => {
      getItems(mockDetailItemData, mockDetailItemDataId).some(x => x.field === 'cloud.instance.id');
    });

    test('it returns the expected description', () => {
      expect(
        getItems(mockDetailItemData, mockDetailItemDataId).find(
          x => x.field === 'cloud.instance.id'
        )!.description
      ).toEqual('Instance ID of the host machine. Example: i-1234567890abcdef0');
    });

    test('it returns the expected type', () => {
      expect(
        getItems(mockDetailItemData, mockDetailItemDataId).find(
          x => x.field === 'cloud.instance.id'
        )!.type
      ).toEqual('keyword');
    });

    test('it returns the expected valueAsString', () => {
      expect(
        getItems(mockDetailItemData, mockDetailItemDataId).find(
          x => x.field === 'cloud.instance.id'
        )!.values[0].valueAsString
      ).toEqual('5412578377715150143');
    });

    test('it returns a draggable wrapper with the expected value.key', () => {
      expect(
        getItems(mockDetailItemData, mockDetailItemDataId).find(
          x => x.field === 'cloud.instance.id'
        )!.values[0].value.key
      ).toMatch(/^event-field-browser-value-for-cloud.instance.id-\S+$/);
    });

    describe('formatting data for display', () => {
      const justDateFields = getItems(mockDetailItemData, mockDetailItemDataId).filter(
        item => item.type === 'date'
      );

      const nonDateFields = getItems(mockDetailItemData, mockDetailItemDataId).filter(
        item => item.type !== 'date'
      );

      test('it should have at least one date field (a sanity check for inputs to other tests)', () => {
        expect(justDateFields.length > 0).toEqual(true); // to ensure the tests below run for at least one date field
      });

      test('it should have at least one NON-date field (a sanity check for inputs to other tests)', () => {
        expect(nonDateFields.length > 0).toEqual(true); // to ensure the tests below run for at least one NON-date field
      });

      justDateFields.forEach(field => {
        test(`it should render a tooltip for the ${field.field} (${field.type}) field`, () => {
          const wrapper = mount(
            <TestProviders>
              <>{field.values[0].value}</>
            </TestProviders>
          );

          expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(true);
        });
      });

      nonDateFields.forEach(field => {
        test(`it should NOT render a tooltip for the NON-date ${field.field} (${
          field.type
        }) field`, () => {
          const wrapper = mount(
            <TestProviders>
              <>{field.values[0].value}</>
            </TestProviders>
          );

          expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(
            false
          );
        });
      });
    });
  });
});
