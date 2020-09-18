/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertSearchResponse, AlertsIndex, Privilege } from './types';

export const alertsMock: AlertSearchResponse<unknown, unknown> = {
  took: 7,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    hits: [
      {
        _index: '.siem-signals-default-000001',
        _id: '820e05ab0a10a2110d6f0ab2e1864402724a88680d5b49840ecc17dd069d7646',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          event: {
            kind: 'signal',
            code: 4625,
            created: '2020-02-15T00:09:19.454Z',
            module: 'security',
            type: 'authentication_failure',
            outcome: 'failure',
            provider: 'Microsoft-Windows-Security-Auditing',
            action: 'logon-failed',
            category: 'authentication',
          },
          winlog: {
            record_id: 4864460,
            task: 'Logon',
            logon: {
              failure: {
                reason: 'Unknown user name or bad password.',
                status: 'This is either due to a bad username or authentication information',
                sub_status: 'User logon with misspelled or bad user account',
              },
              type: 'Network',
            },
            channel: 'Security',
            event_id: 4625,
            process: {
              pid: 548,
              thread: {
                id: 292,
              },
            },
            api: 'wineventlog',
            opcode: 'Info',
            computer_name: 'siem-windows',
            keywords: ['Audit Failure'],
            activity_id: '{96816605-032c-0000-eaad-4c5f58e1d501}',
            provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
            event_data: {
              Status: '0xc000006d',
              LmPackageName: '-',
              SubjectUserSid: 'S-1-0-0',
              SubjectLogonId: '0x0',
              TransmittedServices: '-',
              SubjectDomainName: '-',
              LogonProcessName: 'NtLmSsp ',
              AuthenticationPackageName: 'NTLM',
              KeyLength: '0',
              SubjectUserName: '-',
              TargetUserSid: 'S-1-0-0',
              FailureReason: '%%2313',
              SubStatus: '0xc0000064',
              LogonType: '3',
              TargetUserName: 'ADMIN',
            },
            provider_name: 'Microsoft-Windows-Security-Auditing',
          },
          process: {
            pid: 0,
            executable: '-',
            name: '-',
          },
          agent: {
            type: 'winlogbeat',
            ephemeral_id: 'cbee8ae0-2c75-4999-ba16-71d482247f52',
            hostname: 'siem-windows',
            id: '19b2de73-7b9a-4e92-b3e7-82383ac5f389',
            version: '7.5.1',
          },
          cloud: {
            availability_zone: 'us-east1-b',
            project: {
              id: 'elastic-beats',
            },
            provider: 'gcp',
            instance: {
              id: '3849238371046563697',
              name: 'siem-windows',
            },
            machine: {
              type: 'g1-small',
            },
          },
          log: {
            level: 'information',
          },
          message:
            'An account failed to log on.\n\nSubject:\n\tSecurity ID:\t\tS-1-0-0\n\tAccount Name:\t\t-\n\tAccount Domain:\t\t-\n\tLogon ID:\t\t0x0\n\nLogon Type:\t\t\t3\n\nAccount For Which Logon Failed:\n\tSecurity ID:\t\tS-1-0-0\n\tAccount Name:\t\tADMIN\n\tAccount Domain:\t\t\n\nFailure Information:\n\tFailure Reason:\t\tUnknown user name or bad password.\n\tStatus:\t\t\t0xC000006D\n\tSub Status:\t\t0xC0000064\n\nProcess Information:\n\tCaller Process ID:\t0x0\n\tCaller Process Name:\t-\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t185.209.0.96\n\tSource Port:\t\t0\n\nDetailed Authentication Information:\n\tLogon Process:\t\tNtLmSsp \n\tAuthentication Package:\tNTLM\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon request fails. It is generated on the computer where access was attempted.\n\nThe Subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe Logon Type field indicates the kind of logon that was requested. The most common types are 2 (interactive) and 3 (network).\n\nThe Process Information fields indicate which account and process on the system requested the logon.\n\nThe Network Information fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
          user: {
            name: 'ADMIN',
            id: 'S-1-0-0',
          },
          source: {
            ip: '185.209.0.96',
            port: 0,
            domain: '-',
          },
          ecs: {
            version: '1.1.0',
          },
          host: {
            name: 'siem-windows',
            os: {
              name: 'Windows Server 2019 Datacenter',
              kernel: '10.0.17763.1039 (WinBuild.160101.0800)',
              build: '17763.1039',
              platform: 'windows',
              version: '10.0',
              family: 'windows',
            },
            id: 'ae32054e-0d4a-4c4d-88ec-b840f992e1c2',
            hostname: 'siem-windows',
            architecture: 'x86_64',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: 'AdctRnABMQha2n6boR1M',
              type: 'event',
              index: 'winlogbeat-7.5.1-2020.01.15-000001',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: 'AdctRnABMQha2n6boR1M',
                type: 'event',
                index: 'winlogbeat-7.5.1-2020.01.15-000001',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.714Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              code: 4625,
              created: '2020-02-15T00:09:19.454Z',
              module: 'security',
              type: 'authentication_failure',
              outcome: 'failure',
              provider: 'Microsoft-Windows-Security-Auditing',
              action: 'logon-failed',
              category: 'authentication',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: 'f461e2132bdf3926ef1fe10c83e671707ff3f12348ce600b8490c97a0c704086',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          source: {
            ip: '10.142.0.7',
            port: 42774,
            packets: 2,
            bytes: 80,
          },
          server: {
            bytes: 10661,
            ip: '169.254.169.254',
            port: 80,
            packets: 3,
          },
          service: {
            type: 'system',
          },
          system: {
            audit: {
              socket: {
                egid: 0,
                kernel_sock_address: '0xffff8dd0103d2000',
                uid: 0,
                gid: 0,
                euid: 0,
              },
            },
          },
          destination: {
            bytes: 10661,
            ip: '169.254.169.254',
            port: 80,
            packets: 3,
          },
          host: {
            architecture: 'x86_64',
            os: {
              name: 'Debian GNU/Linux',
              kernel: '4.9.0-8-amd64',
              codename: 'stretch',
              platform: 'debian',
              version: '9 (stretch)',
              family: 'debian',
            },
            id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
            containerized: false,
            hostname: 'siem-kibana',
            name: 'siem-kibana',
          },
          agent: {
            type: 'auditbeat',
            ephemeral_id: '60adc2c2-ab48-4e5c-b557-e73549400a79',
            hostname: 'siem-kibana',
            id: '03ccb0ce-f65c-4279-a619-05f1d5bb000b',
            version: '7.5.0',
          },
          client: {
            ip: '10.142.0.7',
            port: 42774,
            packets: 2,
            bytes: 80,
          },
          cloud: {
            machine: {
              type: 'n1-standard-2',
            },
            availability_zone: 'us-east1-b',
            instance: {
              name: 'siem-kibana',
              id: '5412578377715150143',
            },
            project: {
              id: 'elastic-beats',
            },
            provider: 'gcp',
          },
          network: {
            type: 'ipv4',
            transport: 'tcp',
            packets: 5,
            bytes: 10741,
            community_id: '1:qTY0+fxFYZvNHSUM4xTnCKjq8hM=',
            direction: 'outbound',
          },
          group: {
            name: 'root',
            id: '0',
          },
          tags: ['7.5.0-bc2'],
          ecs: {
            version: '1.1.0',
          },
          user: {
            id: '0',
            name: 'root',
          },
          event: {
            dataset: 'socket',
            kind: 'signal',
            action: 'network_flow',
            category: 'network_traffic',
            start: '2020-02-15T00:09:18.360Z',
            end: '2020-02-15T00:09:18.361Z',
            duration: 746181,
            module: 'system',
          },
          process: {
            pid: 746,
            name: 'google_accounts',
            args: ['/usr/bin/python3', '/usr/bin/google_accounts_daemon'],
            executable: '/usr/bin/python3.5',
            created: '2020-02-14T18:31:08.280Z',
          },
          flow: {
            final: true,
            complete: false,
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '59ctRnABMQha2n6bmhzN',
              type: 'event',
              index: 'auditbeat-7.5.0-2020.01.14-000002',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '59ctRnABMQha2n6bmhzN',
                type: 'event',
                index: 'auditbeat-7.5.0-2020.01.14-000002',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.795Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              dataset: 'socket',
              kind: 'event',
              action: 'network_flow',
              category: 'network_traffic',
              start: '2020-02-15T00:09:18.360Z',
              end: '2020-02-15T00:09:18.361Z',
              duration: 746181,
              module: 'system',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '428551fed9382740e808f27ea64ce53b4d3b8cc82401d83afd47969339a0f6e3',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          service: {
            type: 'system',
          },
          message: 'Process sleep (PID: 317535) by user root STARTED',
          ecs: {
            version: '1.0.0',
          },
          host: {
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
            os: {
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
          },
          cloud: {
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
          },
          event: {
            kind: 'signal',
            action: 'process_started',
            module: 'system',
            dataset: 'process',
          },
          process: {
            executable: '/bin/sleep',
            start: '2020-02-15T00:09:17.850Z',
            args: ['sleep', '1'],
            working_directory: '/',
            name: 'sleep',
            ppid: 239348,
            pid: 317535,
            hash: {
              sha1: '9dc3644a028d1a4c853924c427f5e7d668c38ef7',
            },
            entity_id: 'vtgDN10edfL0mX5p',
          },
          user: {
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
            name: 'root',
          },
          agent: {
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '7tctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '7tctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              action: 'process_started',
              module: 'system',
              dataset: 'process',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '9f6d771532d8f2b314c65b5007b1b9e2fcd206dca352b9b244c971341a09f5ce',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          service: {
            type: 'system',
          },
          event: {
            dataset: 'process',
            kind: 'signal',
            action: 'process_error',
            module: 'system',
          },
          message:
            'ERROR for PID 317759: failed to hash executable / for PID 317759: failed to calculate file hashes: read /: is a directory',
          cloud: {
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
          },
          host: {
            architecture: 'x86_64',
            os: {
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
            },
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          agent: {
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
          },
          error: {
            message:
              'failed to hash executable / for PID 317759: failed to calculate file hashes: read /: is a directory',
          },
          process: {
            entity_id: 'ahsj04Ppla09U8Q2',
            name: 'runc:[2:INIT]',
            args: ['runc', 'init'],
            pid: 317759,
            ppid: 317706,
            working_directory: '/',
            executable: '/',
            start: '2020-02-15T00:09:18.360Z',
          },
          user: {
            name: 'root',
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
          },
          ecs: {
            version: '1.0.0',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '79ctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '79ctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              dataset: 'process',
              kind: 'error',
              action: 'process_error',
              module: 'system',
            },
          },
        },
      },
    ],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '4',
          doc_count: 12600,
          alerts: {
            buckets: [
              {
                key_as_string: '2020-01-21T04:30:00.000Z',
                key: 1579581000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-22T03:00:00.000Z',
                key: 1579662000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-23T01:30:00.000Z',
                key: 1579743000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-24T00:00:00.000Z',
                key: 1579824000000,
                doc_count: 0,
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockAlertsQuery: object = {
  aggs: {
    alertsByGrouping: {
      terms: {
        field: 'signal.rule.risk_score',
        missing: 'All others',
        order: { _count: 'desc' },
        size: 10,
      },
      aggs: {
        alerts: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '81000000ms',
            min_doc_count: 0,
            extended_bounds: { min: 1579644343954, max: 1582236343955 },
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
        { range: { '@timestamp': { gte: 1579644343954, lte: 1582236343955 } } },
      ],
    },
  },
};

export const mockStatusAlertQuery: object = {
  bool: {
    filter: {
      terms: { _id: ['b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5'] },
    },
  },
};

export const mockSignalIndex: AlertsIndex = {
  name: 'mock-signal-index',
};

export const mockUserPrivilege: Privilege = {
  username: 'elastic',
  has_all_requested: false,
  cluster: {
    monitor_ml: true,
    manage_ccr: true,
    manage_index_templates: true,
    monitor_watcher: true,
    monitor_transform: true,
    read_ilm: true,
    manage_security: true,
    manage_own_api_key: false,
    manage_saml: true,
    all: true,
    manage_ilm: true,
    manage_ingest_pipelines: true,
    read_ccr: true,
    manage_rollup: true,
    monitor: true,
    manage_watcher: true,
    manage: true,
    manage_transform: true,
    manage_token: true,
    manage_ml: true,
    manage_pipeline: true,
    monitor_rollup: true,
    transport_client: true,
    create_snapshot: true,
  },
  index: {
    '.siem-signals-default': {
      all: true,
      manage_ilm: true,
      read: true,
      create_index: true,
      read_cross_cluster: true,
      index: true,
      monitor: true,
      delete: true,
      manage: true,
      delete_index: true,
      create_doc: true,
      view_index_metadata: true,
      create: true,
      manage_follow_index: true,
      manage_leader_index: true,
      write: true,
    },
  },
  is_authenticated: true,
  has_encryption_key: true,
};
