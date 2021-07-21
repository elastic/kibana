/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultIndexPatterns, Args } from './helpers';
import { initialSourcererState, SourcererScopeName } from './model';

let defaultArgs: Args = {
  eventType: 'all',
  id: SourcererScopeName.default,
  selectedPatterns: ['journalbeat-*'],
  state: {
    ...initialSourcererState,
    kibanaIndexPatterns: [
      initialSourcererState.defaultIndexPattern,
      { id: '123', title: 'journalbeat-*' },
    ],
    signalIndexName: 'signals-*',
  },
};
const eventTypes: Array<Args['eventType']> = ['all', 'raw', 'alert', 'signal', 'custom'];
const ids: Array<Args['id']> = [
  SourcererScopeName.default,
  SourcererScopeName.detections,
  SourcererScopeName.timeline,
];
describe('createDefaultIndexPatterns', () => {
  ids.forEach((id) => {
    eventTypes.forEach((eventType) => {
      describe(`id: ${id}, eventType: ${eventType}`, () => {
        beforeEach(() => {
          defaultArgs = {
            ...defaultArgs,
            id,
            eventType,
          };
        });
        it('Selected patterns', () => {
          const result = createDefaultIndexPatterns(defaultArgs);
          expect(result).toEqual(['journalbeat-*']);
        });
        it('No selected patterns', () => {
          const newArgs = {
            ...defaultArgs,
            selectedPatterns: [],
          };
          const result = createDefaultIndexPatterns(newArgs);
          if (
            id === SourcererScopeName.detections ||
            (id === SourcererScopeName.timeline &&
              (eventType === 'alert' || eventType === 'signal'))
          ) {
            expect(result).toEqual(['signals-*']);
          } else if (id === SourcererScopeName.timeline && eventType === 'all') {
            expect(result).toEqual([initialSourcererState.defaultIndexPattern.title, 'signals-*']);
          } else {
            expect(result).toEqual([initialSourcererState.defaultIndexPattern.title]);
          }
        });
      });
    });
  });
});
