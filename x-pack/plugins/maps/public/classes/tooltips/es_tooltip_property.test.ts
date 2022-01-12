/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternField, IndexPattern } from 'src/plugins/data/public';
import { ESTooltipProperty } from './es_tooltip_property';
import { TooltipProperty } from './tooltip_property';
import { AbstractField } from '../fields/field';
import { FIELD_ORIGIN } from '../../../common/constants';

class MockField extends AbstractField {}

const APPLY_GLOBAL_QUERY = true;
const DO_NOT_APPLY_GLOBAL_QUERY = false;

const indexPatternField = {
  name: 'machine.os',
  type: 'string',
  esTypes: ['text'],
  count: 0,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: false,
} as IndexPatternField;

const featurePropertyField = new MockField({
  fieldName: 'machine.os',
  origin: FIELD_ORIGIN.SOURCE,
});

const nonFilterableIndexPatternField = {
  name: 'location',
  type: 'geo_point',
  esTypes: ['geo_point'],
  count: 0,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: false,
} as IndexPatternField;

const nonFilterableFeaturePropertyField = new MockField({
  fieldName: 'location',
  origin: FIELD_ORIGIN.SOURCE,
});

const indexPattern = {
  id: 'indexPatternId',
  fields: {
    getByName: (name: string): IndexPatternField | null => {
      if (name === 'machine.os') {
        return indexPatternField;
      }
      if (name === 'location') {
        return nonFilterableIndexPatternField;
      }
      return null;
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
      notFoundFeaturePropertyField,
      APPLY_GLOBAL_QUERY
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
      featurePropertyField,
      APPLY_GLOBAL_QUERY
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

  test('Should return phrase filters when field value is an array', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(featurePropertyField.getName(), await featurePropertyField.getLabel(), [
        'my value',
        'my other value',
      ]),
      indexPattern,
      featurePropertyField,
      APPLY_GLOBAL_QUERY
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
      {
        meta: {
          index: 'indexPatternId',
        },
        query: {
          match_phrase: {
            ['machine.os']: 'my other value',
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
      featurePropertyField,
      APPLY_GLOBAL_QUERY
    );
    expect(await esTooltipProperty.getESFilters()).toEqual([
      {
        meta: {
          index: 'indexPatternId',
          negate: true,
        },
        query: {
          exists: {
            field: 'machine.os',
          },
        },
      },
    ]);
  });

  test('Should return empty array when applyGlobalQuery is false', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        featurePropertyField.getName(),
        await featurePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      featurePropertyField,
      DO_NOT_APPLY_GLOBAL_QUERY
    );
    expect(await esTooltipProperty.getESFilters()).toEqual([]);
  });
});

describe('isFilterable', () => {
  test('Should by true when field is filterable and apply global query is true', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        featurePropertyField.getName(),
        await featurePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      featurePropertyField,
      APPLY_GLOBAL_QUERY
    );
    expect(esTooltipProperty.isFilterable()).toBe(true);
  });

  test('Should by false when field is not filterable and apply global query is true', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        nonFilterableFeaturePropertyField.getName(),
        await nonFilterableFeaturePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      nonFilterableFeaturePropertyField,
      APPLY_GLOBAL_QUERY
    );
    expect(esTooltipProperty.isFilterable()).toBe(false);
  });

  test('Should by false when field is filterable and apply global query is false', async () => {
    const esTooltipProperty = new ESTooltipProperty(
      new TooltipProperty(
        featurePropertyField.getName(),
        await featurePropertyField.getLabel(),
        'my value'
      ),
      indexPattern,
      featurePropertyField,
      DO_NOT_APPLY_GLOBAL_QUERY
    );
    expect(esTooltipProperty.isFilterable()).toBe(false);
  });
});
