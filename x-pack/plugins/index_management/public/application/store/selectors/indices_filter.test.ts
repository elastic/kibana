/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExtensionsService } from '../../../services';
import { getFilteredIndices, setExtensionsService } from '.';
// @ts-ignore
import { defaultTableState } from '../reducers/table_state';

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
    expect(getFilteredIndices(state, { location: { search: '' } })).toEqual([
      { name: 'index2', hidden: false },
      { name: 'index3' },
    ]);
  });

  it('includes hidden indices', () => {
    expect(
      getFilteredIndices(state, { location: { search: '?includeHiddenIndices=true' } })
    ).toEqual([
      { name: 'index1', hidden: true },
      { name: 'index2', hidden: false },
      { name: 'index3' },
      { name: '.index4' },
    ]);
  });
});
