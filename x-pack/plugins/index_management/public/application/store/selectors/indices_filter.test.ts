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
        test: { name: 'index1', hidden: true, dataStream: '123' },
        anotherTest: { name: 'index2', hidden: false },
        aTest: { name: 'index3', dataStream: 'abc' },
        aFinalTest: { name: '.index4' },
      },
      allIds: ['test', 'anotherTest', 'aTest', 'aFinalTest'],
    },
  };

  it('filters out hidden indices', () => {
    expect(getFilteredIndices(state, { location: { search: '' } })).toEqual([
      { name: 'index2', hidden: false },
      { name: 'index3', dataStream: 'abc' },
    ]);
  });

  it('includes hidden indices', () => {
    expect(
      getFilteredIndices(state, { location: { search: '?includeHiddenIndices=true' } })
    ).toEqual([
      { name: 'index1', hidden: true, dataStream: '123' },
      { name: 'index2', hidden: false },
      { name: 'index3', dataStream: 'abc' },
      { name: '.index4' },
    ]);
  });

  it('filters based on data stream', () => {
    expect(getFilteredIndices(state, { location: { search: '?dataStreams=abc' } })).toEqual([
      // We don't expect to see a case like this in the wild because data stream backing indicies
      // are always hidden, but our logic can handle it
      { name: 'index3', dataStream: 'abc' },
    ]);
  });

  it('filters based on data stream and includes hidden indices', () => {
    expect(
      getFilteredIndices(state, {
        location: { search: '?includeHiddenIndices=true&dataStreams=123,abc,does-not-exist' },
      })
    ).toEqual([
      { name: 'index1', hidden: true, dataStream: '123' },
      { name: 'index3', dataStream: 'abc' },
    ]);
  });
});
