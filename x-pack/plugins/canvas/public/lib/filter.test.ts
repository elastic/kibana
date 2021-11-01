/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';
import {
  Filter as FilterType,
  FilterViewInstance,
  FlattenFilterViewInstance,
  SimpleFilterViewField,
} from '../../types';
import { FilterViewSpec } from '../filter_view_types';
import {
  defaultFormatter,
  formatFilterView,
  flattenFilterView,
  transformFilterView,
  getFilterFormatter,
} from './filter';

const formatterFactory = (value: unknown) => () => JSON.stringify(value);
const fc: FC<any> = () => null;

const simpleFilterValue: FilterType = {
  type: 'exactly',
  column: 'project',
  value: 'kibana',
  filterGroup: 'someGroup',
};

const filterWithNestedValue: FilterType = {
  type: 'exactly',
  column: 'project',
  value: { nestedField1: 'nestedField1', nestedField2: 'nestedField2' },
  filterGroup: 'someGroup',
};

const simpleFilterView: FilterViewInstance = {
  type: { label: 'label' },
  column: { label: 'column' },
  value: { label: 'value' },
  filterGroup: { label: 'filterGroup' },
};

const nestedFilterView: FilterViewInstance = {
  type: { label: 'label' },
  column: { label: 'column' },
  value: (value: unknown) => ({
    nested: {
      label: 'nested',
      formatter: formatterFactory(value),
    },
  }),
  filterGroup: { label: 'filterGroup' },
};

jest.mock('../filter_view_types', () => ({
  filterViewsRegistry: {
    get: (type: string) => {
      const views: Record<string, FilterViewSpec> = {
        default: { name: 'default', view: () => simpleFilterView },
        simple: { name: 'simple', view: () => simpleFilterView },
        nested: { name: 'nested', view: () => nestedFilterView },
      };
      return views[type] ? views[type] : views.default;
    },
  },
}));

describe('defaultFormatter', () => {
  it('returns string when passed not null/undefined/falsy/emtpy value', () => {
    expect(defaultFormatter(10)).toBe('10');
    expect(defaultFormatter('10')).toBe('10');
    const objToFormat = { field: 10 };
    expect(defaultFormatter(objToFormat)).toBe(objToFormat.toString());
    const arrToFormat = [10, 20];
    expect(defaultFormatter(arrToFormat)).toBe(arrToFormat.toString());
  });

  it("returns '-' when passed null/undefined/falsy/emtpy value", () => {
    const empty = '-';
    expect(defaultFormatter(null)).toBe(empty);
    expect(defaultFormatter(undefined)).toBe(empty);
    expect(defaultFormatter('')).toBe(empty);
    expect(defaultFormatter(false)).toBe(empty);
  });
});

describe('flattenFilterView returns fn which', () => {
  it('returns the same filter view if it expects all fiends to be simple values', () => {
    const flattenFn = flattenFilterView(simpleFilterValue);
    expect(flattenFn(simpleFilterView)).toEqual(simpleFilterView);
  });

  it('returns the same filter view if filterValue is empty object', () => {
    const flattenFn = flattenFilterView({} as any);
    expect(flattenFn(simpleFilterView)).toEqual(simpleFilterView);
  });

  it('returns empty filter view if filter view is empty object', () => {
    const flattenFn = flattenFilterView(simpleFilterValue);
    expect(flattenFn({} as any)).toEqual({});
  });

  it('returns single nesting filter view if it expects some fields to be nested objects', () => {
    const flattenFn = flattenFilterView(filterWithNestedValue);
    const { value, ...restExpectedFields } = nestedFilterView;
    const flattenFilterViewRes = flattenFn(nestedFilterView);

    expect(flattenFilterViewRes).toEqual({
      ...restExpectedFields,
      nested: {
        label: 'nested',
        formatter: expect.any(Function),
      },
    });
    expect(flattenFilterViewRes.nested.formatter?.()).toBe(
      formatterFactory(filterWithNestedValue.value)()
    );
  });

  it('returns single nesting filter view if filterValue is empty object', () => {
    const flattenFn = flattenFilterView({} as any);
    const { value, ...rest } = nestedFilterView;
    expect(flattenFn(nestedFilterView)).toEqual({
      ...rest,
      nested: {
        label: 'nested',
        formatter: expect.any(Function),
      },
    });
  });
});

describe('formatFilterView returns fn which', () => {
  const simpleFlattenFilterView: FlattenFilterViewInstance = {
    type: { label: 'label' },
    value: { label: 'value' },
    column: { label: 'column' },
    filterGroup: { label: 'filterGroup' },
    nestedField: { label: 'nestedField', formatter: () => 'null' },
  };

  it('returns formatted filter view with any passed keys', () => {
    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn(simpleFlattenFilterView)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
      nestedField: { label: 'nestedField', formattedValue: 'null' },
    });
  });

  it("returns formatted filter view with formattedValue = '-' ", () => {
    const formatFn = formatFilterView({} as any);
    expect(formatFn(simpleFlattenFilterView)).toEqual({
      type: { label: 'label', formattedValue: '-' },
      value: { label: 'value', formattedValue: '-' },
      column: { label: 'column', formattedValue: '-' },
      filterGroup: { label: 'filterGroup', formattedValue: '-' },
      nestedField: { label: 'nestedField', formattedValue: 'null' },
    });
  });

  it('returns emtpy object when filter view is empty object', () => {
    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn({} as any)).toEqual({});
  });

  it('returns filter view fields with component property if defined at filter view', () => {
    const flattenFilterViewWithComponent: FlattenFilterViewInstance = {
      ...simpleFlattenFilterView,
      nestedField: {
        ...simpleFlattenFilterView.nestedField,
        component: fc,
      },
    };

    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn(flattenFilterViewWithComponent)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
      nestedField: { label: 'nestedField', formattedValue: 'null', component: fc },
    });
  });
});

describe('transformFilterView returns fn which', () => {
  it('returns simple filter view with formattedValue and components', () => {
    const simpleFilterValueWithComponent = {
      ...simpleFilterView,
      value: {
        ...(simpleFilterView.value as SimpleFilterViewField),
        component: fc,
      },
    };
    const transformFn = transformFilterView(simpleFilterValueWithComponent);

    expect(transformFn(simpleFilterValue)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value, component: fc },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
    });
  });

  it('returns nested filter view with formattedValue and components', () => {
    const nestedFilterViewWithComponent = {
      ...nestedFilterView,
      value: (value: unknown) => ({
        nested: {
          label: 'nested',
          formatter: formatterFactory(value),
          component: fc,
        },
      }),
    };
    const transformFn = transformFilterView(nestedFilterViewWithComponent);
    expect(transformFn(filterWithNestedValue)).toEqual({
      type: { label: 'label', formattedValue: filterWithNestedValue.type },
      column: { label: 'column', formattedValue: filterWithNestedValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: filterWithNestedValue.filterGroup },
      nested: {
        label: 'nested',
        formattedValue: formatterFactory(filterWithNestedValue.value)(),
        component: fc,
      },
    });
  });
});

describe('getFilterFormatter returns fn which', () => {
  const simpleResult = {
    type: { label: 'label', formattedValue: simpleFilterValue.type },
    value: { label: 'value', formattedValue: simpleFilterValue.value },
    column: { label: 'column', formattedValue: simpleFilterValue.column },
    filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
  };

  const nestedResult = {
    type: { label: 'label', formattedValue: simpleFilterValue.type },
    column: { label: 'column', formattedValue: simpleFilterValue.column },
    filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
    nested: {
      label: 'nested',
      formattedValue: formatterFactory(filterWithNestedValue.value)(),
    },
  };

  it('returns filter view by filter view name', () => {
    const formatterFn = getFilterFormatter('simple');
    expect(formatterFn(simpleFilterValue)).toEqual(simpleResult);

    const formatterFn2 = getFilterFormatter('nested');
    expect(formatterFn2(filterWithNestedValue)).toEqual(nestedResult);
  });

  it('returns default filter view if filter view name is not specified', () => {
    const formatterFn = getFilterFormatter();
    expect(formatterFn(simpleFilterValue)).toEqual(simpleResult);
  });

  it('returns default filter view if filter view name was not found', () => {
    const formatterFn = getFilterFormatter('some_absent_filter_vew');
    expect(formatterFn(simpleFilterValue)).toEqual(simpleResult);
  });
});
