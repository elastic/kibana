/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createDefaultIndexPatterns, Args } from './helpers';
import { initialSourcererState, SourcererScopeName } from './model';

let defaultArgs: Args = {
  eventType: 'all',
  id: SourcererScopeName.default,
  selectedPatterns: ['auditbeat-*', 'packetbeat-*'],
  state: {
    ...initialSourcererState,
    configIndexPatterns: ['filebeat-*', 'auditbeat-*', 'packetbeat-*'],
    kibanaIndexPatterns: [{ id: '123', title: 'journalbeat-*' }],
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
    eventTypes.forEach((et) => {
      describe(`id: ${id}, eventType: ${et}`, () => {
        beforeEach(() => {
          defaultArgs = {
            ...defaultArgs,
            id,
            eventType: et,
          };
        });
        it('Selected patterns', () => {
          const result = createDefaultIndexPatterns(defaultArgs);
          expect(result).toEqual(['auditbeat-*', 'packetbeat-*']);
        });
        it('No selected patterns', () => {
          const newArgs = {
            ...defaultArgs,
            selectedPatterns: [],
          };
          const result = createDefaultIndexPatterns(newArgs);
          if (
            id === SourcererScopeName.detections ||
            (id === SourcererScopeName.timeline && (et === 'alert' || et === 'signal'))
          ) {
            expect(result).toEqual(['signals-*']);
          } else if (id === SourcererScopeName.timeline && et === 'all') {
            expect(result).toEqual(['filebeat-*', 'auditbeat-*', 'packetbeat-*', 'signals-*']);
          } else {
            expect(result).toEqual(['filebeat-*', 'auditbeat-*', 'packetbeat-*']);
          }
        });
      });
    });
  });
});
