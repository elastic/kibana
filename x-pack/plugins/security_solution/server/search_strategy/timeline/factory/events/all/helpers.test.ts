/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventHit } from '../../../../../../common/search_strategy';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { formatTimelineData } from './helpers';

describe('#formatTimelineData', () => {
  it('happy path', () => {
    const response: EventHit = {
      _index: 'auditbeat-7.8.0-2020.11.05-000003',
      _id: 'tkCt1nUBaEgqnrVSZ8R_',
      _score: 0,
      _type: '',
      fields: {
        'event.category': ['process'],
        'process.ppid': [3977],
        'user.name': ['jenkins'],
        'process.args': ['go', 'vet', './...'],
        message: ['Process go (PID: 4313) by user jenkins STARTED'],
        'process.pid': [4313],
        'process.working_directory': [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/src/github.com/elastic/beats/libbeat',
        ],
        'process.entity_id': ['Z59cIkAAIw8ZoK0H'],
        'host.ip': ['10.224.1.237', 'fe80::4001:aff:fee0:1ed', '172.17.0.1'],
        'process.name': ['go'],
        'event.action': ['process_started'],
        'agent.type': ['auditbeat'],
        '@timestamp': ['2020-11-17T14:48:08.922Z'],
        'event.module': ['system'],
        'event.type': ['start'],
        'host.name': ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
        'process.hash.sha1': ['1eac22336a41e0660fb302add9d97daa2bcc7040'],
        'host.os.family': ['debian'],
        'event.kind': ['event'],
        'host.id': ['e59991e835905c65ed3e455b33e13bd6'],
        'event.dataset': ['process'],
        'process.executable': [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/.gvm/versions/go1.14.7.linux.amd64/bin/go',
        ],
      },
      _source: {},
      sort: ['1605624488922', 'beats-ci-immutable-ubuntu-1804-1605624279743236239'],
      aggregations: {},
    };

    expect(
      formatTimelineData(
        ['@timestamp', 'host.name', 'destination.ip', 'source.ip'],
        TIMELINE_EVENTS_FIELDS,
        response
      )
    ).toEqual({
      cursor: {
        tiebreaker: 'beats-ci-immutable-ubuntu-1804-1605624279743236239',
        value: '1605624488922',
      },
      node: {
        _id: 'tkCt1nUBaEgqnrVSZ8R_',
        _index: 'auditbeat-7.8.0-2020.11.05-000003',
        data: [
          {
            field: '@timestamp',
            value: ['2020-11-17T14:48:08.922Z'],
          },
          {
            field: 'host.name',
            value: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
          },
        ],
        ecs: {
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
          timestamp: '2020-11-17T14:48:08.922Z',
          user: {
            name: ['jenkins'],
          },
        },
      },
    });
  });
});
