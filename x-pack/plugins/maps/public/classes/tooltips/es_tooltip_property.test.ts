/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFieldType, IndexPattern } from '../../../../../../src/plugins/data/public';
import { ESTooltipProperty } from './es_tooltip_property';
import { TooltipProperty } from './tooltip_property';
import { AbstractField } from '../fields/field';
import { FIELD_ORIGIN } from '../../../common/constants';

class MockField extends AbstractField {}

const indexPatternField = {
  name: 'machine.os',
  type: 'string',
  esTypes: ['text'],
  count: 0,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: false,
} as IFieldType;

const featurePropertyField = new MockField({
  fieldName: 'machine.os',
  origin: FIELD_ORIGIN.SOURCE,
});

const indexPattern = {
  id: 'indexPatternId',
  fields: {
    getByName: (name: string): IFieldType | null => {
      return name === 'machine.os' ? indexPatternField : null;
    },
  },
  title: 'my index pattern',
} as IndexPattern;

describe('getESFilters', () => {
  test('Should return empty array when field does not exist in index pattern', async () => {
    const notFoundFeaturePropertyField = new MockField({
      fieldName: 'field name that is not in index pattern',
      origin: FIELD_ORIGIN.SOURCE,
    });
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        notFoundFeaturePropertyField.getName(),
        await notFoundFeaturePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      notFoundFeaturePropertyField
    );
    expect(await esTooltipProperty.getESFilters()).toEqual([]);
  });

  test('Should return phrase filter when field value is provided', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        featurePropertyField.getName(),
        await featurePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      featurePropertyField
    );
    expect(await esTooltipProperty.getESFilters()).toEqual([
      {
        meta: {
          index: 'indexPatternId',
        },
        query: {
          match_phrase: {
            ['machine.os']: 'my value',
          },
        },
      },
    ]);
  });

  test('Should return NOT exists filter for null values', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        featurePropertyField.getName(),
        await featurePropertyField.getLabel(),
        undefined
      ),
      indexPattern,
      featurePropertyField
    );
    expect(await esTooltipProperty.getESFilters()).toEqual([
      {
        meta: {
          index: 'indexPatternId',
          negate: true,
        },
        exists: {
          field: 'machine.os',
        },
      },
    ]);
  });
});
