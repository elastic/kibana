/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import { LensAppLocatorDefinition, type LensAppLocatorParams } from './locator';

const savedObjectId: string = '571aaf70-4c88-11e8-b3d7-01146121b73d';

const setup = async () => {
  const locator = new LensAppLocatorDefinition();

  return {
    locator,
  };
};

const lensShareableState: LensAppLocatorParams = {
  visualization: { activeId: 'bar_chart', state: {} },
  activeDatasourceId: 'xxxxx',
  datasourceState: { formBased: {} },
  references: [],
};

function getParams(path: string, param: string) {
  // just make it a valid URL
  // in order to extract the search params
  const basepathTest = 'http://localhost/';
  const url = new URL(path, basepathTest);
  return url.searchParams.get(param);
}

describe('Lens url generator', () => {
  test('can create a link to Lens with no state and no saved viz', async () => {
    const { locator } = await setup();
    const { app, path, state } = await locator.getLocation({});

    expect(app).toBe('lens');
    expect(path).toBeDefined();
    expect(state.payload).toBeDefined();
    expect(Object.keys(state.payload)).toHaveLength(0);
  });

  test('can create a link to a saved viz in Lens', async () => {
    const { locator } = await setup();
    const { path } = await locator.getLocation({ savedObjectId });

    expect(path.includes(`#/edit/${savedObjectId}`)).toBe(true);
  });

  test('can specify specific time range', async () => {
    const { locator } = await setup();
    const { path, state } = await locator.getLocation({
      resolvedDateRange: { fromDate: 'now', toDate: 'now-15m', mode: 'relative' },
    });
    expect(getParams(path, '_g')).toEqual('(time:(from:now,to:now-15m))');
    expect(state.payload.resolvedDateRange).toBeDefined();
  });

  test('can specify query', async () => {
    const { locator } = await setup();
    const { path, state } = await locator.getLocation({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
    expect(getParams(path, '_g')).toEqual('()');
    expect(state.payload).toEqual({
      query: {
        language: 'kuery',
        query: 'foo',
      },
    });
  });

  test('can specify local and global filters', async () => {
    const { locator } = await setup();
    const { path, state } = await locator.getLocation({
      filters: [
        {
          meta: {
            alias: 'foo',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
        {
          meta: {
            alias: 'bar',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
    });
    expect(getParams(path, '_g')).toEqual(
      "(filters:!(('$state':(store:appState),meta:(alias:foo,disabled:!f,negate:!f))))"
    );
    expect(state.payload).toEqual({
      filters: [
        {
          meta: {
            alias: 'foo',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
        {
          meta: {
            alias: 'bar',
            disabled: false,
            negate: false,
          },
          $state: {
            store: FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
    });
  });

  test('can specify a search session id', async () => {
    const { locator } = await setup();
    const { state } = await locator.getLocation({
      searchSessionId: '__test__',
    });

    expect(state.payload).toEqual({ searchSessionId: '__test__' });
  });

  test('should return state if all params are passed correctly', async () => {
    const { locator } = await setup();
    const { state } = await locator.getLocation(lensShareableState);

    expect(Object.keys(state.payload)).toHaveLength(0);
  });

  test('should return no state for partial/missing state params', async () => {
    const { locator } = await setup();
    const { state } = await locator.getLocation({ ...lensShareableState, references: undefined });

    expect(Object.keys(state.payload)).toHaveLength(0);
  });

  test('should create data view when dataViewSpec is used', async () => {
    const dataViewSpecMock = {
      id: 'mock-id',
      title: 'mock-title',
      timeFieldName: 'mock-time-field-name',
    };
    const { locator } = await setup();
    const { state } = await locator.getLocation({ dataViewSpecs: [dataViewSpecMock] });

    expect(state.payload.dataViewSpecs).toEqual([dataViewSpecMock]);
  });
});
