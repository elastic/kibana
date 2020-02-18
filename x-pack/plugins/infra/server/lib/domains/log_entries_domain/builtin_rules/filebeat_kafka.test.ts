/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBuiltinRules } from '.';
import { compileFormattingRules } from '../message';

const { format } = compileFormattingRules(getBuiltinRules([]));

describe('Filebeat Rules', () => {
  describe('in ECS format', () => {
    test('kafka log', () => {
      const flattenedDocument = {
        '@timestamp': '2017-08-04T10:48:21.063Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'kafka.log',
        'event.module': 'kafka',
        'fileset.name': 'log',
        'input.type': 'log',
        'kafka.log.class': 'kafka.controller.KafkaController',
        'kafka.log.component': 'Controller 0',
        'log.level': 'INFO',
        'log.offset': 131,
        message: '0 successfully elected as the controller',
        'service.type': 'kafka',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.dataset",
    "highlights": Array [],
    "value": "kafka.log",
  },
  Object {
    "constant": "][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "INFO",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "0 successfully elected as the controller",
  },
]
`);
    });
  });
});
