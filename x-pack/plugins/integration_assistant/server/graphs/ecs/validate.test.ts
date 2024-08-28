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
            target: 'event.id',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
          code: {
            target: 'event.code',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          time: {
            target: '@timestamp',
            confidence: 0.95,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SS'Z'"],
          },
          cluster_name: null,
          user: {
            target: 'user.name',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          success: {
            target: 'event.outcome',
            confidence: 0.9,
            type: 'boolean',
            date_formats: [],
          },
          error: null,
          method: null,
          user_agent: {
            target: 'user_agent.original',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          addr: {
            remote: {
              target: 'source.address',
              confidence: 0.9,
              type: 'string',
              date_formats: [],
            },
          },
          required_private_key_policy: null,
          mfa_device: {
            mfa_device_name: null,
            mfa_device_uuid: null,
            mfa_device_type: null,
          },
          cert_type: null,
          identity: {
            user: {
              target: 'user.name',
              confidence: 0.95,
              type: 'string',
              date_formats: [],
            },
            roles: {
              target: 'user.roles',
              confidence: 0.9,
              type: 'string',
              date_formats: [],
            },
            logins: null,
            expires: {
              target: 'user.changes.group.name',
              confidence: 0.6,
              type: 'date',
              date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
            },
            route_to_cluster: {
              target: 'destination.domain',
              confidence: 0.7,
              type: 'string',
              date_formats: [],
            },
            traits: {
              aws_role_arns: null,
              azure_identities: null,
              db_names: null,
              db_roles: null,
              db_users: null,
              gcp_service_accounts: null,
              host_user_gid: null,
              host_user_uid: null,
              kubernetes_groups: null,
              kubernetes_users: null,
              logins: {
                target: 'user.name',
                confidence: 0.8,
                type: 'string',
                date_formats: [],
              },
              windows_logins: null,
            },
            teleport_cluster: {
              target: 'host.name',
              confidence: 0.7,
              type: 'string',
              date_formats: [],
            },
            database_users: null,
            client_ip: {
              target: 'source.ip',
              confidence: 0.9,
              type: 'string',
              date_formats: [],
            },
            prev_identity_expires: {
              target: 'event.end',
              confidence: 0.6,
              type: 'date',
              date_formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'"],
            },
            private_key_policy: null,
          },
          login: {
            target: 'user.name',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          user_kind: null,
          sid: {
            target: 'event.id',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
          private_key_policy: null,
          namespace: null,
          server_id: {
            target: 'host.id',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          server_hostname: {
            target: 'host.hostname',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          server_addr: {
            target: 'destination.address',
            confidence: 0.85,
            type: 'string',
            date_formats: [],
          },
          server_labels: {
            hostname: {
              target: 'host.name',
              confidence: 0.9,
              type: 'string',
              date_formats: [],
            },
          },
          'addr.local': {
            target: 'source.address',
            confidence: 0.85,
            type: 'string',
            date_formats: [],
          },
          proto: {
            target: 'network.protocol',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          size: {
            target: 'process.title',
            confidence: 0.7,
            type: 'string',
            date_formats: [],
          },
          initial_command: null,
          session_recording: null,
          tx: {
            target: 'source.bytes',
            confidence: 0.8,
            type: 'number',
            date_formats: [],
          },
          rx: {
            target: 'destination.bytes',
            confidence: 0.8,
            type: 'number',
            date_formats: [],
          },
          enhanced_recording: {
            target: 'event.outcome',
            confidence: 0.6,
            type: 'boolean',
            date_formats: [],
          },
          interactive: {
            target: 'event.action',
            confidence: 0.7,
            type: 'boolean',
            date_formats: [],
          },
          participants: {
            target: 'user.name',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          session_start: {
            target: 'event.start',
            confidence: 0.95,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
          },
          session_stop: {
            target: 'event.end',
            confidence: 0.95,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
          },
        },
      },
    };
    const samples = [
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"8c815e54-c83b-43d7-b578-2bcf5b6775fa","code":"T1000W","time":"2024-05-09T20:58:57.77Z","cluster_name":"teleport.ericbeahan.com","user":"root","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52457"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"6bf237a0-2753-418d-b01b-2d82ebf42636","code":"T1000W","time":"2024-05-09T21:00:22.747Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52818"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"d8da99bd-ed26-4096-af9e-82c56c0a4ac1","code":"T1000W","time":"2024-05-09T21:00:35.175Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","success":false,"error":"invalid username, password or second factor","method":"local","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52880"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"c325a91c-62b5-473d-b906-9926d6ce4530","code":"T1000I","time":"2024-05-09T21:00:40.632Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","required_private_key_policy":"none","success":true,"method":"local","mfa_device":{"mfa_device_name":"otp-device","mfa_device_uuid":"d07bf388-af49-4ec2-b8a4-c8a9e785b70b","mfa_device_type":"TOTP"},"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:52906"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"cert.create","uid":"e751fff4-9d66-45ee-abfb-c1ded55ba6f2","code":"TC000I","time":"2024-05-09T21:00:40.673Z","cluster_name":"teleport.ericbeahan.com","cert_type":"user","identity":{"user":"teleport-admin","roles":["access","editor","aws-dynamodb-access"],"logins":["root","ubuntu","ec2-user","-teleport-internal-join"],"expires":"2024-05-10T09:00:40.662729264Z","route_to_cluster":"teleport.ericbeahan.com","traits":{"aws_role_arns":null,"azure_identities":null,"db_names":null,"db_roles":null,"db_users":null,"gcp_service_accounts":null,"host_user_gid":[""],"host_user_uid":[""],"kubernetes_groups":null,"kubernetes_users":null,"logins":["root","ubuntu","ec2-user"],"windows_logins":null},"teleport_cluster":"teleport.ericbeahan.com","database_users":["ExampleTeleportDynamoDBRole"],"client_ip":"136.32.177.60","prev_identity_expires":"0001-01-01T00:00:00Z","private_key_policy":"none"}}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"session.start","uid":"3259b2ea-55e2-427f-8e81-80699018e83a","code":"T2000I","time":"2024-05-09T21:00:50.249Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"a2836fe1-51b5-4ab6-994e-f2f32eb97dc5","private_key_policy":"none","namespace":"default","server_id":"b321c207-fd08-46c8-b248-0c20436feb62","server_hostname":"ip-172-31-13-98.us-east-2.compute.internal","server_addr":"[::]:3022","server_labels":{"hostname":"ip-172-31-13-98.us-east-2.compute.internal"},"addr.local":"172.31.13.98:443","addr.remote":"136.32.177.60:52963","proto":"ssh","size":"80:25","initial_command":[""],"session_recording":"node"}}}',
      '{"teleport_log":{"audit":{"ei":762,"event":"session.leave","uid":"71dad1cb-bc19-4f99-9233-ce195c9fe145","code":"T2003I","time":"2024-05-09T21:06:16.023Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"a2836fe1-51b5-4ab6-994e-f2f32eb97dc5","private_key_policy":"none","namespace":"default","server_id":"b321c207-fd08-46c8-b248-0c20436feb62","server_hostname":"ip-172-31-13-98.us-east-2.compute.internal","server_addr":"[::]:3022","server_labels":{"hostname":"ip-172-31-13-98.us-east-2.compute.internal"}}}}',
      '{"teleport_log":{"audit":{"ei":2147483646,"event":"session.data","uid":"1c05cfe5-706a-49f6-af17-2ffdd777cfd2","code":"T2006I","time":"2024-05-09T21:06:16.026Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"a2836fe1-51b5-4ab6-994e-f2f32eb97dc5","private_key_policy":"none","namespace":"default","server_id":"b321c207-fd08-46c8-b248-0c20436feb62","server_hostname":"ip-172-31-13-98.us-east-2.compute.internal","addr.local":"172.31.13.98:443","addr.remote":"136.32.177.60:52963","tx":17536,"rx":387749}}}',
      '{"teleport_log":{"audit":{"ei":763,"event":"session.end","uid":"47d16bef-29d1-4b65-a222-4fcfc18e3347","code":"T2004I","time":"2024-05-09T21:06:21.024Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"a2836fe1-51b5-4ab6-994e-f2f32eb97dc5","private_key_policy":"none","addr.remote":"136.32.177.60:52963","proto":"ssh","namespace":"default","server_id":"b321c207-fd08-46c8-b248-0c20436feb62","server_hostname":"ip-172-31-13-98.us-east-2.compute.internal","server_addr":"[::]:3022","server_labels":{"hostname":"ip-172-31-13-98.us-east-2.compute.internal"},"enhanced_recording":false,"interactive":true,"participants":["teleport-admin"],"session_start":"2024-05-09T21:00:50.239984794Z","session_stop":"2024-05-09T21:06:21.024064124Z","session_recording":"node"}}}',
      '{"teleport_log":{"audit":{"ei":0,"event":"user.login","uid":"93f1a71d-cd39-4d1b-94cc-2bae1d19b1e1","code":"T1000I","time":"2024-05-09T21:06:35.601Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","required_private_key_policy":"none","success":true,"method":"local","mfa_device":{"mfa_device_name":"otp-device","mfa_device_uuid":"d07bf388-af49-4ec2-b8a4-c8a9e785b70b","mfa_device_type":"TOTP"},"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36","addr.remote":"136.32.177.60:54537"}}}',
    ];
    const duplicates = findDuplicateFields(samples, finalMapping);

    expect(duplicates).toBe('test');
  });
});
