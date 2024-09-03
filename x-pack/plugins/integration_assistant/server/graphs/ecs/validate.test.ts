/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findDuplicateFields, findInvalidEcsFields, processMapping } from './validate';

describe('Testing ecs handler', () => {
  it('processMapping()', async () => {
    const path: string[] = [];
    const value = {
      checkpoint: {
        firewall: {
          product: null,
          sequencenum: null,
          subject: null,
          ifdir: null,
          origin: {
            target: 'source.address',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          flags: null,
          sendtotrackerasadvancedauditlog: null,
          originsicname: null,
          version: null,
          administrator: {
            target: 'user.name',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
          foo: {
            target: null, // Invalid value , to be skipped
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
        },
      },
    };
    const output: Record<string, string[][]> = {};
    await processMapping(path, value, output);
    expect(output).toEqual({
      'source.address': [['checkpoint', 'firewall', 'origin']],
      'user.name': [['checkpoint', 'firewall', 'administrator']],
    });
  });
});

describe('findInvalidEcsFields', () => {
  it('invalid: invalid ecs mapping', async () => {
    const ecsMappingInvalid = {
      mysql_enterprise: {
        audit: {
          test_array: null,
          bytes: {
            target: 'myField.bytes',
            confidence: 0.99,
            type: 'number',
            date_formats: [],
          },
        },
      },
    };

    const invalid = findInvalidEcsFields(ecsMappingInvalid);
    expect(invalid.length).toBe(1);
  });

  it('invalid: reserved ecs field', async () => {
    const ecsMappingReserved = {
      mysql_enterprise: {
        audit: {
          test_array: null,
          type: {
            target: 'event.type',
            confidence: 'error',
            type: 'string',
            date_formats: [],
          },
        },
      },
    };

    const invalid = findInvalidEcsFields(ecsMappingReserved);
    expect(invalid.length).toBe(1);
  });
});

describe('findDuplicateFields', () => {
  it('duplicates: samples with duplicates', async () => {
    const finalMapping = {
      teleport_log: {
        audit: {
          ei: null,
          event: {
            target: 'event.action',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          uid: {
            target: 'event.action',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
        },
      },
    };
    const samples = [
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"8c815e54-c83b-43d7-b578-2bcf5b6775fa","code":"T1000W","time":"2024-05-09T20:58:57.77Z","cluster_name":"teleport.ericbeahan.com","user":"root","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52457"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"6bf237a0-2753-418d-b01b-2d82ebf42636","code":"T1000W","time":"2024-05-09T21:00:22.747Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52818"}}}',
    ];
    const duplicates = findDuplicateFields(samples, finalMapping);
    expect(duplicates).toStrictEqual([
      "One or more samples have matching fields for ECS field 'event.action': teleport_log.audit.event, teleport_log.audit.uid",
    ]);
  });
});
