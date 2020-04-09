/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatMongodbRules } from './filebeat_mongodb';

const { format } = compileFormattingRules(filebeatMongodbRules);

describe('Filebeat Rules', () => {
  describe('in pre-ECS format', () => {
    test('mongodb log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-02-05T12:44:56.677Z',
        'event.dataset': 'mongodb.log',
        'fileset.module': 'mongodb',
        'fileset.name': 'log',
        'input.type': 'log',
        'mongodb.log.component': 'STORAGE',
        'mongodb.log.context': 'initandlisten',
        'mongodb.log.message':
          'wiredtiger_open config: create,cache_size=8G,session_max=20000,eviction=(threads_max=4),config_base=false,statistics=(fast),log=(enabled=true,archive=true,path=journal,compressor=snappy),file_manager=(close_idle_time=100000),checkpoint=(wait=60,log_size=2GB),statistics_log=(wait=0),',
        'mongodb.log.severity': 'I',
        offset: 281,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[MongoDB][",
  },
  Object {
    "field": "mongodb.log.component",
    "highlights": Array [],
    "value": "STORAGE",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "mongodb.log.message",
    "highlights": Array [],
    "value": "wiredtiger_open config: create,cache_size=8G,session_max=20000,eviction=(threads_max=4),config_base=false,statistics=(fast),log=(enabled=true,archive=true,path=journal,compressor=snappy),file_manager=(close_idle_time=100000),checkpoint=(wait=60,log_size=2GB),statistics_log=(wait=0),",
  },
]
`);
    });
  });
});
