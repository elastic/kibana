/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { Args } from './helpers';
// import { initialSourcererState, SourcererScopeName } from './model';

// const defaultArgs: Args = {
//   eventType: 'all',
//   id: SourcererScopeName.default,
//   selectedPatterns: ['journalbeat-*'],
//   state: {
//     ...initialSourcererState,
//     kibanaDataViews: [
//       initialSourcererState.defaultDataView,
//       { id: '123', title: 'journalbeat-*', patternList: ['journalbeat-*'] },
//     ],
//     signalIndexName: 'signals-*',
//   },
// };
// const eventTypes: Array<Args['eventType']> = ['all', 'raw', 'alert', 'signal', 'custom'];
// const ids: Array<Args['id']> = [
//   SourcererScopeName.default,
//   SourcererScopeName.detections,
//   SourcererScopeName.timeline,
// ];
describe('sourcerer store helpers', () => {
  // TODO: Steph/sourcerer helpers tests
  it('getScopePatternListSelection', () => {
    expect(true).toBeTruthy();
  });
  it('validateSelectedPatterns', () => {
    expect(true).toBeTruthy();
  });
  it('defaultDataViewByEventType', () => {
    expect(true).toBeTruthy();
  });
});
