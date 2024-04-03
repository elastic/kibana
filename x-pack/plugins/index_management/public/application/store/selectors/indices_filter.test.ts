/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExtensionsService } from '@kbn/index-management';
import { getFilteredIndices } from '.';
// @ts-ignore
import { defaultTableState } from '../reducers/table_state';
import { setExtensionsService } from './extension_service';

describe('getFilteredIndices selector', () => {
  let extensionService: ExtensionsService;
  beforeAll(() => {
    extensionService = new ExtensionsService();
    extensionService.setup();
    setExtensionsService(extensionService);
  });

  const state = {
    tableState: { ...defaultTableState },
    indices: {
      byId: {
        test: { name: 'index1', hidden: true },
        anotherTest: { name: 'index2', hidden: false },
        aTest: { name: 'index3' },
        aFinalTest: { name: '.index4' },
      },
      allIds: ['test', 'anotherTest', 'aTest', 'aFinalTest'],
    },
  };

  it('filters out hidden indices', () => {
    const expected = [{ name: 'index2', hidden: false }, { name: 'index3' }, { name: '.index4' }];

    expect(getFilteredIndices(state)).toEqual(expected);
  });

  it('includes hidden indices', () => {
    expect(
      getFilteredIndices({
        ...state,
        tableState: {
          ...defaultTableState,
          toggleNameToVisibleMap: { includeHiddenIndices: true },
        },
      })
    ).toEqual([
      { name: 'index1', hidden: true },
      { name: 'index2', hidden: false },
      { name: 'index3' },
      { name: '.index4' },
    ]);
  });
});
