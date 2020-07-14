/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverState } from '../types';
import { createStore } from 'redux';
import { ResolverAction } from './actions';
import { resolverReducer } from './reducer';
import * as selectors from './selectors';
import resolverTreeThatBreaksStuff from './data/resolver_tree_that_breaks_stuff.json';

describe('resolver selectors', () => {
  const actions: ResolverAction[] = [];

  /**
   * Get state, given an ordered collection of actions.
   */
  const state: () => ResolverState = () => {
    const store = createStore(resolverReducer);
    for (const action of actions) {
      store.dispatch(action);
    }
    return store.getState();
  };
  describe('ariaFlowtoNodeID', () => {
    describe('when a weird tree is loaded', () => {
      beforeEach(() => {
        actions.push({
          type: 'serverReturnedResolverData',
          payload: {
            result: goofyData(),
            // this value doesn't matter
            databaseDocumentID: '',
          },
        });
      });
      it('should not throw', () => {
        const entityIDsInTree = [
          'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
          'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
          'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTg1MDgtMTMyMzkxNTQ1NTQuMzU1NDEwMDA=',
        ];
        for (const entityID of entityIDsInTree) {
          expect(() => selectors.ariaFlowtoNodeID(state())(0)(entityID)).not.toThrow();
        }
      });
    });
  });
});

function goofyData(): ResolverTree {
  return {
    entityID:
      'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTg1MDgtMTMyMzkxNTQ1NTQuMzU1NDEwMDA=',
    children: { childNodes: [], nextChild: null },
    relatedEvents: { events: [], nextEvent: null },
    relatedAlerts: {
      alerts: [],
      nextAlert: null,
    },
    lifecycle: [
      {
        '@timestamp': '2020-07-13T22:55:54.35541000Z',
        agent: {
          type: 'endpoint',
        },
        event: {
          action: 'start',
          category: ['process'],
          created: '2020-07-13T22:55:54.35541000Z',
          kind: 'event',
          type: ['start'],
        },
        process: {
          entity_id:
            'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTg1MDgtMTMyMzkxNTQ1NTQuMzU1NDEwMDA=',
          name: 'mimikatz.exe',
          parent: {
            entity_id:
              'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
            name: 'powershell_ise.exe',
            pid: 4820,
          },
          pid: 8508,
        },
      },
      {
        '@timestamp': '2020-07-13T22:55:56.41496500Z',
        agent: {
          type: 'endpoint',
        },
        event: {
          action: 'end',
          category: ['process'],
          created: '2020-07-13T22:55:56.41496500Z',
          dataset: 'endpoint.events.process',
          id: 'LknaCZg8RTuwpMnM++++++2I',
          kind: 'event',
          module: 'endpoint',
          sequence: 149,
          type: ['end'],
        },
        message: 'Endpoint process event',
        process: {
          entity_id:
            'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTg1MDgtMTMyMzkxNTQ1NTQuMzU1NDEwMDA=',
          name: 'mimikatz.exe',
          parent: {
            entity_id:
              'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
            name: 'powershell_ise.exe',
            pid: 4820,
          },
          pid: 8508,
        },
      },
    ],
    ancestry: {
      ancestors: [
        {
          entityID:
            'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
          lifecycle: [
            {
              '@timestamp': '2020-05-14T12:52:44.17560400Z',
              agent: {
                type: 'endpoint',
              },
              event: {
                category: ['process'],
                created: '2020-05-14T12:52:44.17560400Z',
                dataset: 'endpoint.events.process',
                id: 'LknZAfCH0lJv15SZ+++++++v',
                kind: 'event',
                module: 'endpoint',
                sequence: 99,
                type: ['info'],
              },
              process: {
                entity_id:
                  'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
                name: 'explorer.exe',
                parent: { pid: 3548 },
                pid: 3604,
              },
            },
            {
              '@timestamp': '2020-05-14T12:52:44.17560400Z',
              agent: {
                type: 'endpoint',
              },
              event: {
                category: ['process'],
                created: '2020-05-14T12:52:44.17560400Z',
                dataset: 'endpoint.events.process',
                id: 'LknaCZg8RTuwpMnM+++++++f',
                kind: 'event',
                module: 'endpoint',
                sequence: 50,
                type: ['info'],
              },
              process: {
                entity_id:
                  'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
                executable: 'C:\\Windows\\explorer.exe',
                hash: {
                  md5: 'f7dc8a74e30e08b9510380274cfb9288',
                  sha1: 'c893cf07e5f65749cd66e17d9523638b132c87b2',
                  sha256: 'c5e88d778c0b118d49bef467ed059c09b61deea505d2a3d5ca1dcc0a5cdf752f',
                },
                name: 'explorer.exe',
                parent: { pid: 3548 },
                pe: { original_file_name: 'EXPLORER.EXE' },
                pid: 3604,
              },
            },
          ],
          stats: {
            totalAlerts: 0,
            events: { total: 69, byCategory: { registry: 69 } },
          },
        },
        {
          entityID:
            'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
          lifecycle: [
            {
              '@timestamp': '2020-05-14T12:59:11.72276200Z',
              agent: {
                type: 'endpoint',
              },
              event: {
                category: ['process'],
                created: '2020-05-14T12:59:11.72276200Z',
                dataset: 'endpoint.events.process',
                id: 'LknZAfCH0lJv15SZ++++++/I',
                kind: 'event',
                module: 'endpoint',
                sequence: 124,
                type: ['info'],
              },
              process: {
                entity_id:
                  'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
                name: 'powershell_ise.exe',
                parent: {
                  entity_id:
                    'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
                  executable: 'C:\\Windows\\explorer.exe',
                  name: 'explorer.exe',
                  pid: 3604,
                },
                pid: 4820,
              },
            },
            {
              '@timestamp': '2020-05-14T12:59:11.72276200Z',
              agent: {
                type: 'endpoint',
              },
              event: {
                category: ['process'],
                created: '2020-05-14T12:59:11.72276200Z',
                dataset: 'endpoint.events.process',
                id: 'LknaCZg8RTuwpMnM++++++/2',
                kind: 'event',
                module: 'endpoint',
                sequence: 75,
                type: ['info'],
              },
              process: {
                entity_id:
                  'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTQ4MjAtMTMyMzM5MzQ3NTEuNzIyNzYyMDA=',
                name: 'powershell_ise.exe',
                parent: {
                  entity_id:
                    'OGRmNDQ5MWUtZjg3OC00OGEyLWJjY2EtNWUxNTFjZDI4YWEzLTM2MDQtMTMyMzM5MzQzNjQuMTc1NjA0MDA=',
                  executable: 'C:\\Windows\\explorer.exe',
                  name: 'explorer.exe',
                  pid: 3604,
                },
                pid: 4820,
              },
            },
          ],
          stats: {
            totalAlerts: 0,
            events: { total: 31, byCategory: { file: 25, network: 6 } },
          },
        },
      ],
      nextAncestor: null,
    },
    stats: { totalAlerts: 1, events: { total: 0, byCategory: {} } },
  };
}
