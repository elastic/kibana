/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPopulatedMappedFields, virtualEcsSchema } from '../../../public/lib/ecs';
import { mockEcsData } from '../../mock/mock_ecs';
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
  });
});
