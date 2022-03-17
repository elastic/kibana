/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../../../../../common/search_strategy';
import { buildEcsObjects } from './build_ecs_objects';

describe('buildEcsObjects', () => {
  it('should not populate null ecs fields', () => {
    const hitWithMissingInfo: EventHit = {
      _index: '.test-index',
      _id: 'test-id',
      _score: 0,
      _source: {
        '@timestamp': 123456,
        host: {
          architecture: 'windows98',
          hostname: 'test-name',
          id: 'some-id',
          ip: [],
          name: 'test-name',
        },
      },
      fields: {
        '@timestamp': [123456],
        'host.architecture': ['windows98'],
        'host.hostname': ['test-name'],
        'host.id': ['some-id'],
        'host.ip': [],
        'host.name': ['test-name'],
      },
      sort: ['1610199700517'],
    };

    const ecsObject = buildEcsObjects(hitWithMissingInfo);
    expect(ecsObject).toEqual({
      _id: 'test-id',
      _index: '.test-index',
      host: {
        id: ['some-id'],
        ip: [],
        name: ['test-name'],
      },
      timestamp: '123456',
      '@timestamp': ['123456'],
    });
  });

  it('should build nested ecs fields', () => {
    const ecsObject = buildEcsObjects(eventHit);
    expect(ecsObject).toEqual({
      '@timestamp': ['2020-11-17T14:48:08.922Z'],
      _id: 'tkCt1nUBaEgqnrVSZ8R_',
      _index: 'auditbeat-7.8.0-2020.11.05-000003',
      agent: {
        type: ['auditbeat'],
      },
      event: {
        action: ['process_started'],
        category: ['process'],
        dataset: ['process'],
        kind: ['event'],
        module: ['system'],
        type: ['start'],
      },
      host: {
        id: ['e59991e835905c65ed3e455b33e13bd6'],
        ip: ['10.224.1.237', 'fe80::4001:aff:fee0:1ed', '172.17.0.1'],
        name: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
        os: {
          family: ['debian'],
        },
      },
      message: ['Process go (PID: 4313) by user jenkins STARTED'],
      process: {
        args: ['go', 'vet', './...'],
        entity_id: ['Z59cIkAAIw8ZoK0H'],
        executable: [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/.gvm/versions/go1.14.7.linux.amd64/bin/go',
        ],
        hash: {
          sha1: ['1eac22336a41e0660fb302add9d97daa2bcc7040'],
        },
        name: ['go'],
        pid: ['4313'],
        ppid: ['3977'],
        working_directory: [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/src/github.com/elastic/beats/libbeat',
        ],
      },
      threat: {
        enrichments: [
          {
            feed: {
              name: [],
            },
            indicator: {
              provider: ['yourself'],
              reference: [],
            },
            matched: {
              atomic: ['matched_atomic'],
              field: ['matched_field', 'other_matched_field'],
              type: [],
            },
          },
          {
            feed: {
              name: [],
            },
            indicator: {
              provider: ['other_you'],
              reference: [],
            },
            matched: {
              atomic: ['matched_atomic_2'],
              field: ['matched_field_2'],
              type: [],
            },
          },
        ],
      },
      timestamp: '2020-11-17T14:48:08.922Z',
      user: {
        name: ['jenkins'],
      },
    });
  });
});
