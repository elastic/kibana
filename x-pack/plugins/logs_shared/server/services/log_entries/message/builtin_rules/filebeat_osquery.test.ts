/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compileFormattingRules } from '../message';
import { filebeatOsqueryRules } from './filebeat_osquery';

const { format } = compileFormattingRules(filebeatOsqueryRules);

describe('Filebeat Rules', () => {
  describe('in pre-ECS format', () => {
    test('osquery result log', () => {
      const flattenedDocument = {
        '@timestamp': ['2017-12-28T14:40:08.000Z'],
        'event.dataset': ['osquery.result'],
        'fileset.module': ['osquery'],
        'fileset.name': ['result'],
        'input.type': ['log'],
        offset: [0],
        'osquery.result.action': ['removed'],
        'osquery.result.calendar_time': ['Thu Dec 28 14:40:08 2017 UTC'],
        'osquery.result.columns.blocks': ['122061322'],
        'osquery.result.columns.blocks_available': ['75966945'],
        'osquery.result.columns.blocks_free': ['121274885'],
        'osquery.result.columns.blocks_size': ['4096'],
        'osquery.result.columns.device': ['/dev/disk1s4'],
        'osquery.result.columns.device_alias': ['/dev/disk1s4'],
        'osquery.result.columns.flags': ['345018372'],
        'osquery.result.columns.inodes': ['9223372036854775807'],
        'osquery.result.columns.inodes_free': ['9223372036854775804'],
        'osquery.result.columns.path': ['/private/var/vm'],
        'osquery.result.columns.type': ['apfs'],
        'osquery.result.counter': ['1'],
        'osquery.result.decorations.host_uuid': ['4AB2906D-5516-5794-AF54-86D1D7F533F3'],
        'osquery.result.decorations.username': ['tsg'],
        'osquery.result.epoch': ['0'],
        'osquery.result.host_identifier': ['192-168-0-4.rdsnet.ro'],
        'osquery.result.name': ['pack_it-compliance_mounts'],
        'osquery.result.unix_time': ['1514472008'],
        'prospector.type': ['log'],
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
        Array [
          Object {
            "constant": "[Osquery][",
          },
          Object {
            "field": "osquery.result.action",
            "highlights": Array [],
            "value": Array [
              "removed",
            ],
          },
          Object {
            "constant": "] ",
          },
          Object {
            "field": "osquery.result.host_identifier",
            "highlights": Array [],
            "value": Array [
              "192-168-0-4.rdsnet.ro",
            ],
          },
          Object {
            "constant": " ",
          },
          Object {
            "field": "osquery.result.columns.blocks",
            "highlights": Array [],
            "value": Array [
              "122061322",
            ],
          },
          Object {
            "field": "osquery.result.columns.blocks_available",
            "highlights": Array [],
            "value": Array [
              "75966945",
            ],
          },
          Object {
            "field": "osquery.result.columns.blocks_free",
            "highlights": Array [],
            "value": Array [
              "121274885",
            ],
          },
          Object {
            "field": "osquery.result.columns.blocks_size",
            "highlights": Array [],
            "value": Array [
              "4096",
            ],
          },
          Object {
            "field": "osquery.result.columns.device",
            "highlights": Array [],
            "value": Array [
              "/dev/disk1s4",
            ],
          },
          Object {
            "field": "osquery.result.columns.device_alias",
            "highlights": Array [],
            "value": Array [
              "/dev/disk1s4",
            ],
          },
          Object {
            "field": "osquery.result.columns.flags",
            "highlights": Array [],
            "value": Array [
              "345018372",
            ],
          },
          Object {
            "field": "osquery.result.columns.inodes",
            "highlights": Array [],
            "value": Array [
              "9223372036854775807",
            ],
          },
          Object {
            "field": "osquery.result.columns.inodes_free",
            "highlights": Array [],
            "value": Array [
              "9223372036854775804",
            ],
          },
          Object {
            "field": "osquery.result.columns.path",
            "highlights": Array [],
            "value": Array [
              "/private/var/vm",
            ],
          },
          Object {
            "field": "osquery.result.columns.type",
            "highlights": Array [],
            "value": Array [
              "apfs",
            ],
          },
        ]
      `);
    });
  });
});
