/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsQueries, SortField } from '../../../../../../../common/search_strategy';

export const mockOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  docValueFields: [],
  factoryQueryType: HostsQueries.uncommonProcesses,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"host.name":{"query":"siem-kibana"}}}],"should":[],"must_not":[]}}',
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  timerange: {
    interval: '12h',
    from: '2020-09-06T15:23:52.757Z',
    to: '2020-09-07T15:23:52.757Z',
  },
  sort: {} as SortField,
};

export const mockSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 39,
    timed_out: false,
    _shards: {
      total: 21,
      successful: 21,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: -1,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      process_count: {
        value: 92,
      },
      group_by_process: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 35043,
        buckets: [
          {
            key: 'AM_Delta_Patch_1.323.631.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'ayrMZnQBB-gskcly0w7l',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                          'WD',
                          '/q',
                        ],
                        name: 'AM_Delta_Patch_1.323.631.0.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599452531834],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'ayrMZnQBB-gskcly0w7l',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                                'WD',
                                '/q',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\system32\\wuauclt.exe',
                                  '/RunHandlerComServer',
                                ],
                                name: 'wuauclt.exe',
                                pid: 4844,
                                entity_id: '{ce1d3c9b-b573-5f55-b115-000000000b00}',
                                executable: 'C:\\Windows\\System32\\wuauclt.exe',
                                command_line:
                                  '"C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                              },
                              pe: {
                                imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              },
                              name: 'AM_Delta_Patch_1.323.631.0.exe',
                              pid: 4608,
                              working_directory:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\',
                              entity_id: '{ce1d3c9b-b573-5f55-b215-000000000b00}',
                              executable:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                              command_line:
                                '"C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe" WD /q',
                              hash: {
                                sha1: '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                                sha256:
                                  '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                                md5: '5608b911376da958ed93a7f9428ad0b9',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Microsoft Antimalware WU Stub',
                                OriginalFileName: 'AM_Delta_Patch_1.323.631.0.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '1.323.673.0',
                                Product: 'Microsoft Malware Protection',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222529,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 04:22:11.834\nProcessGuid: {ce1d3c9b-b573-5f55-b215-000000000b00}\nProcessId: 4608\nImage: C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe\nFileVersion: 1.323.673.0\nDescription: Microsoft Antimalware WU Stub\nProduct: Microsoft Malware Protection\nCompany: Microsoft Corporation\nOriginalFileName: AM_Delta_Patch_1.323.631.0.exe\nCommandLine: "C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe" WD /q\nCurrentDirectory: C:\\Windows\\SoftwareDistribution\\Download\\Install\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=94EB7F83DDEE6942EC5BDB8E218B5BC942158CB3,MD5=5608B911376DA958ED93A7F9428AD0B9,SHA256=562C58193BA7878B396EBC3FB2DCCECE7EA0D5C6C7D52FC3AC10B62B894260EB,IMPHASH=F96EC1E772808EB81774FB67A4AC229E\nParentProcessGuid: {ce1d3c9b-b573-5f55-b115-000000000b00}\nParentProcessId: 4844\nParentImage: C:\\Windows\\System32\\wuauclt.exe\nParentCommandLine: "C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T04:22:11.834Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                                '5608b911376da958ed93a7f9428ad0b9',
                                '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                                'f96ec1e772808eb81774fb67a4ac229e',
                              ],
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T04:22:12.727Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              type: ['start', 'process_start'],
                              category: ['process'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                              imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              sha256:
                                '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                              md5: '5608b911376da958ed93a7f9428ad0b9',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'AM_Delta_Patch_1.323.673.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'M-GvaHQBA6bGZw2uBoYz',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                          'WD',
                          '/q',
                        ],
                        name: 'AM_Delta_Patch_1.323.673.0.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599484132366],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'M-GvaHQBA6bGZw2uBoYz',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                                'WD',
                                '/q',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\system32\\wuauclt.exe',
                                  '/RunHandlerComServer',
                                ],
                                name: 'wuauclt.exe',
                                pid: 4548,
                                entity_id: '{ce1d3c9b-30e3-5f56-ca15-000000000b00}',
                                executable: 'C:\\Windows\\System32\\wuauclt.exe',
                                command_line:
                                  '"C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                              },
                              pe: {
                                imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              },
                              name: 'AM_Delta_Patch_1.323.673.0.exe',
                              working_directory:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\',
                              pid: 4684,
                              entity_id: '{ce1d3c9b-30e4-5f56-cb15-000000000b00}',
                              executable:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                              command_line:
                                '"C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe" WD /q',
                              hash: {
                                sha1: 'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                                sha256:
                                  '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                                md5: 'd088fcf98bb9aa1e8f07a36b05011555',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Microsoft Antimalware WU Stub',
                                OriginalFileName: 'AM_Delta_Patch_1.323.673.0.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '1.323.693.0',
                                Product: 'Microsoft Malware Protection',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 223146,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 13:08:52.366\nProcessGuid: {ce1d3c9b-30e4-5f56-cb15-000000000b00}\nProcessId: 4684\nImage: C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe\nFileVersion: 1.323.693.0\nDescription: Microsoft Antimalware WU Stub\nProduct: Microsoft Malware Protection\nCompany: Microsoft Corporation\nOriginalFileName: AM_Delta_Patch_1.323.673.0.exe\nCommandLine: "C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe" WD /q\nCurrentDirectory: C:\\Windows\\SoftwareDistribution\\Download\\Install\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=AE1E653F1E53DCD34415A35335F9E44D2A33BE65,MD5=D088FCF98BB9AA1E8F07A36B05011555,SHA256=4382C96613850568D003C02BA0A285F6D2EF9B8C20790FFA2B35641BC831293F,IMPHASH=F96EC1E772808EB81774FB67A4AC229E\nParentProcessGuid: {ce1d3c9b-30e3-5f56-ca15-000000000b00}\nParentProcessId: 4548\nParentImage: C:\\Windows\\System32\\wuauclt.exe\nParentCommandLine: "C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T13:08:52.366Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                                'd088fcf98bb9aa1e8f07a36b05011555',
                                '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                                'f96ec1e772808eb81774fb67a4ac229e',
                              ],
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T13:08:53.889Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                              imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              sha256:
                                '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                              md5: 'd088fcf98bb9aa1e8f07a36b05011555',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DeviceCensus.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'cinEZnQBB-gskclyvNmU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\devicecensus.exe'],
                        name: 'DeviceCensus.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599452000791],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'cinEZnQBB-gskclyvNmU',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\devicecensus.exe'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '0cdb6b589f0a125609d8df646de0ea86',
                              },
                              name: 'DeviceCensus.exe',
                              pid: 5016,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-b360-5f55-a115-000000000b00}',
                              executable: 'C:\\Windows\\System32\\DeviceCensus.exe',
                              command_line: 'C:\\Windows\\system32\\devicecensus.exe',
                              hash: {
                                sha1: '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                                sha256:
                                  'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                                md5: '8159944c79034d2bcabf73d461a7e643',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                Description: 'Device Census',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                OriginalFileName: 'DeviceCensus.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.18362.1035 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222507,
                              task: 'Process Create (rule: ProcessCreate)',
                              event_id: 1,
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 04:13:20.791\nProcessGuid: {ce1d3c9b-b360-5f55-a115-000000000b00}\nProcessId: 5016\nImage: C:\\Windows\\System32\\DeviceCensus.exe\nFileVersion: 10.0.18362.1035 (WinBuild.160101.0800)\nDescription: Device Census\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DeviceCensus.exe\nCommandLine: C:\\Windows\\system32\\devicecensus.exe\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=9E488437B2233E5AD9ABD3151EC28EA51EB64C2D,MD5=8159944C79034D2BCABF73D461A7E643,SHA256=DBEA7473D5E7B3B4948081DACC6E35327D5A588F4FD0A2D68184BFFD10439296,IMPHASH=0CDB6B589F0A125609D8DF646DE0EA86\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T04:13:20.791Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                                '8159944c79034d2bcabf73d461a7e643',
                                'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                                '0cdb6b589f0a125609d8df646de0ea86',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T04:13:22.458Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                              imphash: '0cdb6b589f0a125609d8df646de0ea86',
                              sha256:
                                'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                              md5: '8159944c79034d2bcabf73d461a7e643',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DiskSnapshot.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'HNKSZHQBA6bGZw2uCtRk',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                        name: 'DiskSnapshot.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599415124040],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'HNKSZHQBA6bGZw2uCtRk',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '69bdabb73b409f40ad05f057cec29380',
                              },
                              name: 'DiskSnapshot.exe',
                              pid: 3120,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-2354-5f55-6415-000000000b00}',
                              command_line: 'C:\\Windows\\system32\\disksnapshot.exe -z',
                              executable: 'C:\\Windows\\System32\\DiskSnapshot.exe',
                              hash: {
                                sha1: '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                                sha256:
                                  'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                                md5: 'ece311ff51bd847a3874bfac85449c6b',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'DiskSnapshot.exe',
                                OriginalFileName: 'DiskSnapshot.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.652 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 221799,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-06 17:58:44.040\nProcessGuid: {ce1d3c9b-2354-5f55-6415-000000000b00}\nProcessId: 3120\nImage: C:\\Windows\\System32\\DiskSnapshot.exe\nFileVersion: 10.0.17763.652 (WinBuild.160101.0800)\nDescription: DiskSnapshot.exe\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DiskSnapshot.exe\nCommandLine: C:\\Windows\\system32\\disksnapshot.exe -z\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=61B4D8D4757E15259E1E92C8236F37237B5380D1,MD5=ECE311FF51BD847A3874BFAC85449C6B,SHA256=C7B9591EB4DD78286615401C138C7C1A89F0E358CAAE1786DE2C3B08E904FFDC,IMPHASH=69BDABB73B409F40AD05F057CEC29380\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-06T17:58:44.040Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                                'ece311ff51bd847a3874bfac85449c6b',
                                'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                                '69bdabb73b409f40ad05f057cec29380',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-06T17:58:45.606Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                              imphash: '69bdabb73b409f40ad05f057cec29380',
                              sha256:
                                'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                              md5: 'ece311ff51bd847a3874bfac85449c6b',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DismHost.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '2zncaHQBB-gskcly1QaD',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                          '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                        ],
                        name: 'DismHost.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599487135371],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '2zncaHQBB-gskcly1QaD',
                          _score: 0,
                          _source: {
                            process: {
                              args: [
                                'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                                '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                              ],
                              parent: {
                                args: [
                                  'C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe',
                                ],
                                name: 'MsMpEng.exe',
                                pid: 184,
                                entity_id: '{ce1d3c9b-1b55-5f4f-4913-000000000b00}',
                                executable:
                                  'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2008.9-0\\MsMpEng.exe',
                                command_line:
                                  '"C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe"',
                              },
                              pe: {
                                imphash: 'a644b5814b05375757429dfb05524479',
                              },
                              name: 'DismHost.exe',
                              pid: 1500,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-3c9f-5f56-d315-000000000b00}',
                              executable:
                                'C:\\Windows\\Temp\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\DismHost.exe',
                              command_line:
                                'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe {6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                              hash: {
                                sha1: 'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                                sha256:
                                  'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                                md5: '5867dc628a444f2393f7eff007bd4417',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              type: 'winlogbeat',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Dism Host Servicing Process',
                                OriginalFileName: 'DismHost.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.771 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 223274,
                              task: 'Process Create (rule: ProcessCreate)',
                              event_id: 1,
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 13:58:55.371\nProcessGuid: {ce1d3c9b-3c9f-5f56-d315-000000000b00}\nProcessId: 1500\nImage: C:\\Windows\\Temp\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\DismHost.exe\nFileVersion: 10.0.17763.771 (WinBuild.160101.0800)\nDescription: Dism Host Servicing Process\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DismHost.exe\nCommandLine: C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe {6BB79B50-2038-4A10-B513-2FAC72FF213E}\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=A8A65B6A45A988F06E17EBD04E5462CA730D2337,MD5=5867DC628A444F2393F7EFF007BD4417,SHA256=B94317B7C665F1CEC965E3322E0AA26C8BE29EAF5830FB7FCD7E14AE88A8CF22,IMPHASH=A644B5814B05375757429DFB05524479\nParentProcessGuid: {ce1d3c9b-1b55-5f4f-4913-000000000b00}\nParentProcessId: 184\nParentImage: C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2008.9-0\\MsMpEng.exe\nParentCommandLine: "C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe"',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T13:58:55.371Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                                '5867dc628a444f2393f7eff007bd4417',
                                'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                                'a644b5814b05375757429dfb05524479',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T13:58:56.138Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                              imphash: 'a644b5814b05375757429dfb05524479',
                              sha256:
                                'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                              md5: '5867dc628a444f2393f7eff007bd4417',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SIHClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'gdVuZXQBA6bGZw2uFsPP',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\System32\\sihclient.exe',
                          '/cv',
                          '33nfV21X50ie84HvATAt1w.0.1',
                        ],
                        name: 'SIHClient.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599429545370],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'gdVuZXQBA6bGZw2uFsPP',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\System32\\sihclient.exe',
                                '/cv',
                                '33nfV21X50ie84HvATAt1w.0.1',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\System32\\Upfc.exe',
                                  '/launchtype',
                                  'periodic',
                                  '/cv',
                                  '33nfV21X50ie84HvATAt1w.0',
                                ],
                                name: 'upfc.exe',
                                pid: 4328,
                                entity_id: '{ce1d3c9b-5b8b-5f55-7815-000000000b00}',
                                executable: 'C:\\Windows\\System32\\upfc.exe',
                                command_line:
                                  'C:\\Windows\\System32\\Upfc.exe /launchtype periodic /cv 33nfV21X50ie84HvATAt1w.0',
                              },
                              pe: {
                                imphash: '3bbd1eea2778ee3dcd883a4d5533aec3',
                              },
                              name: 'SIHClient.exe',
                              pid: 2780,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-5ba9-5f55-8815-000000000b00}',
                              executable: 'C:\\Windows\\System32\\SIHClient.exe',
                              command_line:
                                'C:\\Windows\\System32\\sihclient.exe  /cv 33nfV21X50ie84HvATAt1w.0.1',
                              hash: {
                                sha1: '145ef8d82cf1e451381584cd9565a2d35a442504',
                                sha256:
                                  '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                                md5: 'dc1e380b36f4a8309f363d3809e607b8',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'SIH Client',
                                OriginalFileName: 'sihclient.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.1217 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222106,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-06 21:59:05.370\nProcessGuid: {ce1d3c9b-5ba9-5f55-8815-000000000b00}\nProcessId: 2780\nImage: C:\\Windows\\System32\\SIHClient.exe\nFileVersion: 10.0.17763.1217 (WinBuild.160101.0800)\nDescription: SIH Client\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: sihclient.exe\nCommandLine: C:\\Windows\\System32\\sihclient.exe  /cv 33nfV21X50ie84HvATAt1w.0.1\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=145EF8D82CF1E451381584CD9565A2D35A442504,MD5=DC1E380B36F4A8309F363D3809E607B8,SHA256=0E0BB70AE1888060B3FFB9A320963551B56DD0D4CE0B5DC1C8FADDA4B7BF3F6A,IMPHASH=3BBD1EEA2778EE3DCD883A4D5533AEC3\nParentProcessGuid: {ce1d3c9b-5b8b-5f55-7815-000000000b00}\nParentProcessId: 4328\nParentImage: C:\\Windows\\System32\\upfc.exe\nParentCommandLine: C:\\Windows\\System32\\Upfc.exe /launchtype periodic /cv 33nfV21X50ie84HvATAt1w.0',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-06T21:59:05.370Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '145ef8d82cf1e451381584cd9565a2d35a442504',
                                'dc1e380b36f4a8309f363d3809e607b8',
                                '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                                '3bbd1eea2778ee3dcd883a4d5533aec3',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              kind: 'event',
                              created: '2020-09-06T21:59:06.713Z',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '145ef8d82cf1e451381584cd9565a2d35a442504',
                              imphash: '3bbd1eea2778ee3dcd883a4d5533aec3',
                              sha256:
                                '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                              md5: 'dc1e380b36f4a8309f363d3809e607b8',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SpeechModelDownload.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '6NmKZnQBA6bGZw2uma12',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                        ],
                        name: 'SpeechModelDownload.exe',
                      },
                      user: {
                        name: 'NETWORK SERVICE',
                      },
                    },
                    sort: [1599448191225],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '6NmKZnQBA6bGZw2uma12',
                          _score: 0,
                          _source: {
                            process: {
                              args: [
                                'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                              ],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '23bd5f904494d14029d9263cebae088d',
                              },
                              name: 'SpeechModelDownload.exe',
                              working_directory: 'C:\\Windows\\system32\\',
                              pid: 4328,
                              entity_id: '{ce1d3c9b-a47f-5f55-9915-000000000b00}',
                              hash: {
                                sha1: '03e6e81192621dfd873814de3787c6e7d6af1509',
                                sha256:
                                  '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                                md5: '3fd687e97e03d303e02bb37ec85de962',
                              },
                              executable:
                                'C:\\Windows\\System32\\Speech_OneCore\\common\\SpeechModelDownload.exe',
                              command_line:
                                'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9ac-5f34-e403-000000000000}',
                                Description: 'Speech Model Download Executable',
                                OriginalFileName: 'SpeechModelDownload.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '10.0.17763.1369 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e4',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222431,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 03:09:51.225\nProcessGuid: {ce1d3c9b-a47f-5f55-9915-000000000b00}\nProcessId: 4328\nImage: C:\\Windows\\System32\\Speech_OneCore\\common\\SpeechModelDownload.exe\nFileVersion: 10.0.17763.1369 (WinBuild.160101.0800)\nDescription: Speech Model Download Executable\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: SpeechModelDownload.exe\nCommandLine: C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\NETWORK SERVICE\nLogonGuid: {ce1d3c9b-b9ac-5f34-e403-000000000000}\nLogonId: 0x3E4\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=03E6E81192621DFD873814DE3787C6E7D6AF1509,MD5=3FD687E97E03D303E02BB37EC85DE962,SHA256=963FD9DC1B82C44D00EB91D61E2CB442AF7357E3A603C23D469DF53A6376F073,IMPHASH=23BD5F904494D14029D9263CEBAE088D\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T03:09:51.225Z',
                            related: {
                              user: 'NETWORK SERVICE',
                              hash: [
                                '03e6e81192621dfd873814de3787c6e7d6af1509',
                                '3fd687e97e03d303e02bb37ec85de962',
                                '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                                '23bd5f904494d14029d9263cebae088d',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              kind: 'event',
                              created: '2020-09-07T03:09:52.370Z',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              type: ['start', 'process_start'],
                              category: ['process'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'NETWORK SERVICE',
                            },
                            hash: {
                              sha1: '03e6e81192621dfd873814de3787c6e7d6af1509',
                              imphash: '23bd5f904494d14029d9263cebae088d',
                              sha256:
                                '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                              md5: '3fd687e97e03d303e02bb37ec85de962',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'UsoClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'Pi68Z3QBc39KFIJb3txa',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                        name: 'UsoClient.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599468262455],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'Pi68Z3QBc39KFIJb3txa',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '2510e8a4554aef2caf0a913be015929f',
                              },
                              name: 'UsoClient.exe',
                              pid: 3864,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-f2e6-5f55-bc15-000000000b00}',
                              command_line: 'C:\\Windows\\system32\\usoclient.exe StartScan',
                              executable: 'C:\\Windows\\System32\\UsoClient.exe',
                              hash: {
                                sha1: 'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                                sha256:
                                  'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                                md5: '39750d33d277617b322adbb917f7b626',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                Description: 'UsoClient',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                OriginalFileName: 'UsoClient',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.1007 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222846,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 08:44:22.455\nProcessGuid: {ce1d3c9b-f2e6-5f55-bc15-000000000b00}\nProcessId: 3864\nImage: C:\\Windows\\System32\\UsoClient.exe\nFileVersion: 10.0.17763.1007 (WinBuild.160101.0800)\nDescription: UsoClient\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: UsoClient\nCommandLine: C:\\Windows\\system32\\usoclient.exe StartScan\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=EBF56AD89D4740359D5D3D5370B31E56614BBB79,MD5=39750D33D277617B322ADBB917F7B626,SHA256=DF3900CDC3C6F023037AAF2D4407C4E8AAA909013A69539FB4688E2BD099DB85,IMPHASH=2510E8A4554AEF2CAF0A913BE015929F\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T08:44:22.455Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                                '39750d33d277617b322adbb917f7b626',
                                'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                                '2510e8a4554aef2caf0a913be015929f',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T08:44:24.029Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                              imphash: '2510e8a4554aef2caf0a913be015929f',
                              sha256:
                                'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                              md5: '39750d33d277617b322adbb917f7b626',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'apt-compat',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'Ziw-Z3QBB-gskcly0vqU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['/etc/cron.daily/apt-compat'],
                        name: 'apt-compat',
                      },
                      user: {
                        name: 'root',
                        id: 0,
                      },
                    },
                    sort: [1599459901154],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'Ziw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          _source: {
                            agent: {
                              id: 'b1e3298e-10be-4032-b1ee-5a4cbb280aa1',
                              type: 'endpoint',
                              version: '7.9.1',
                            },
                            process: {
                              Ext: {
                                ancestry: [
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjUzOTIzMzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUzMjIzMTAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUyODg0MzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUyMDI5ODAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUwNzM4MjAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODU5LTEzMjQzOTMzNTAxLjc3NTM1MDAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTUyNC0xMzIzNjA4NTMzMC4w',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEtMTMyMzYwODUzMjIuMA==',
                                ],
                              },
                              args: ['/etc/cron.daily/apt-compat'],
                              parent: {
                                name: 'run-parts',
                                pid: 13861,
                                entity_id:
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjUzOTIzMzAw',
                                executable: '/bin/run-parts',
                              },
                              name: 'apt-compat',
                              pid: 13862,
                              args_count: 1,
                              entity_id:
                                'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjU0NDY0MDAw',
                              command_line: '/etc/cron.daily/apt-compat',
                              executable: '/etc/cron.daily/apt-compat',
                              hash: {
                                sha1: '61445721d0b5d86ac0a8386a4ceef450118f4fbb',
                                sha256:
                                  '8eeae3a9df22621d51062e4dadfc5c63b49732b38a37b5d4e52c99c2237e5767',
                                md5: 'bc4a71cbcaeed4179f25d798257fa980',
                              },
                            },
                            message: 'Endpoint process event',
                            '@timestamp': '2020-09-07T06:25:01.154464000Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            data_stream: {
                              namespace: 'default',
                              type: 'logs',
                              dataset: 'endpoint.events.process',
                            },
                            elastic: {
                              agent: {
                                id: 'ebee9a13-9ae3-4a55-9cb7-72ddf053055f',
                              },
                            },
                            host: {
                              hostname: 'siem-kibana',
                              os: {
                                Ext: {
                                  variant: 'Debian',
                                },
                                kernel: '4.9.0-8-amd64 #1 SMP Debian 4.9.130-2 (2018-10-27)',
                                name: 'Linux',
                                family: 'debian',
                                version: '9',
                                platform: 'debian',
                                full: 'Debian 9',
                              },
                              ip: ['127.0.0.1', '::1', '10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                              name: 'siem-kibana',
                              id: 'e50acb49-820b-c60a-392d-2ef75f276301',
                              mac: ['42:01:0a:8e:00:07'],
                              architecture: 'x86_64',
                            },
                            event: {
                              sequence: 197060,
                              ingested: '2020-09-07T06:26:44.476888Z',
                              created: '2020-09-07T06:25:01.154464000Z',
                              kind: 'event',
                              module: 'endpoint',
                              action: 'exec',
                              id: 'Lp6oofT0fzv0Auzq+++/kwCO',
                              category: ['process'],
                              type: ['start'],
                              dataset: 'endpoint.events.process',
                            },
                            user: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                            group: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'bsdmainutils',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'aSw-Z3QBB-gskcly0vqU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['/etc/cron.daily/bsdmainutils'],
                        name: 'bsdmainutils',
                      },
                      user: {
                        name: 'root',
                        id: 0,
                      },
                    },
                    sort: [1599459901155],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'aSw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          _source: {
                            agent: {
                              id: 'b1e3298e-10be-4032-b1ee-5a4cbb280aa1',
                              type: 'endpoint',
                              version: '7.9.1',
                            },
                            process: {
                              Ext: {
                                ancestry: [
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1MzMwMzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUzMjIzMTAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUyODg0MzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUyMDI5ODAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUwNzM4MjAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODU5LTEzMjQzOTMzNTAxLjc3NTM1MDAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTUyNC0xMzIzNjA4NTMzMC4w',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEtMTMyMzYwODUzMjIuMA==',
                                ],
                              },
                              args: ['/etc/cron.daily/bsdmainutils'],
                              parent: {
                                name: 'run-parts',
                                pid: 13861,
                                entity_id:
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1MzMwMzAw',
                                executable: '/bin/run-parts',
                              },
                              name: 'bsdmainutils',
                              pid: 13863,
                              args_count: 1,
                              entity_id:
                                'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1ODEyMDAw',
                              command_line: '/etc/cron.daily/bsdmainutils',
                              executable: '/etc/cron.daily/bsdmainutils',
                              hash: {
                                sha1: 'fd24f1f3986e5527e804c4dccddee29ff42cb682',
                                sha256:
                                  'a68002bf1dc9f42a150087b00437448a46f7cae6755ecddca70a6d3c9d20a14b',
                                md5: '559387f792462a62e3efb1d573e38d11',
                              },
                            },
                            message: 'Endpoint process event',
                            '@timestamp': '2020-09-07T06:25:01.155812000Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            data_stream: {
                              namespace: 'default',
                              type: 'logs',
                              dataset: 'endpoint.events.process',
                            },
                            elastic: {
                              agent: {
                                id: 'ebee9a13-9ae3-4a55-9cb7-72ddf053055f',
                              },
                            },
                            host: {
                              hostname: 'siem-kibana',
                              os: {
                                Ext: {
                                  variant: 'Debian',
                                },
                                kernel: '4.9.0-8-amd64 #1 SMP Debian 4.9.130-2 (2018-10-27)',
                                name: 'Linux',
                                family: 'debian',
                                version: '9',
                                platform: 'debian',
                                full: 'Debian 9',
                              },
                              ip: ['127.0.0.1', '::1', '10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                              name: 'siem-kibana',
                              id: 'e50acb49-820b-c60a-392d-2ef75f276301',
                              mac: ['42:01:0a:8e:00:07'],
                              architecture: 'x86_64',
                            },
                            event: {
                              sequence: 197063,
                              ingested: '2020-09-07T06:26:44.477164Z',
                              created: '2020-09-07T06:25:01.155812000Z',
                              kind: 'event',
                              module: 'endpoint',
                              action: 'exec',
                              id: 'Lp6oofT0fzv0Auzq+++/kwCZ',
                              category: ['process'],
                              type: ['start'],
                              dataset: 'endpoint.events.process',
                            },
                            user: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                            group: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
};
export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 39,
    timed_out: false,
    _shards: {
      total: 21,
      successful: 21,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: -1,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      process_count: {
        value: 92,
      },
      group_by_process: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 35043,
        buckets: [
          {
            key: 'AM_Delta_Patch_1.323.631.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'ayrMZnQBB-gskcly0w7l',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                          'WD',
                          '/q',
                        ],
                        name: 'AM_Delta_Patch_1.323.631.0.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599452531834],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'ayrMZnQBB-gskcly0w7l',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                                'WD',
                                '/q',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\system32\\wuauclt.exe',
                                  '/RunHandlerComServer',
                                ],
                                name: 'wuauclt.exe',
                                pid: 4844,
                                entity_id: '{ce1d3c9b-b573-5f55-b115-000000000b00}',
                                executable: 'C:\\Windows\\System32\\wuauclt.exe',
                                command_line:
                                  '"C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                              },
                              pe: {
                                imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              },
                              name: 'AM_Delta_Patch_1.323.631.0.exe',
                              pid: 4608,
                              working_directory:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\',
                              entity_id: '{ce1d3c9b-b573-5f55-b215-000000000b00}',
                              executable:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                              command_line:
                                '"C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe" WD /q',
                              hash: {
                                sha1: '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                                sha256:
                                  '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                                md5: '5608b911376da958ed93a7f9428ad0b9',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Microsoft Antimalware WU Stub',
                                OriginalFileName: 'AM_Delta_Patch_1.323.631.0.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '1.323.673.0',
                                Product: 'Microsoft Malware Protection',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222529,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 04:22:11.834\nProcessGuid: {ce1d3c9b-b573-5f55-b215-000000000b00}\nProcessId: 4608\nImage: C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe\nFileVersion: 1.323.673.0\nDescription: Microsoft Antimalware WU Stub\nProduct: Microsoft Malware Protection\nCompany: Microsoft Corporation\nOriginalFileName: AM_Delta_Patch_1.323.631.0.exe\nCommandLine: "C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe" WD /q\nCurrentDirectory: C:\\Windows\\SoftwareDistribution\\Download\\Install\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=94EB7F83DDEE6942EC5BDB8E218B5BC942158CB3,MD5=5608B911376DA958ED93A7F9428AD0B9,SHA256=562C58193BA7878B396EBC3FB2DCCECE7EA0D5C6C7D52FC3AC10B62B894260EB,IMPHASH=F96EC1E772808EB81774FB67A4AC229E\nParentProcessGuid: {ce1d3c9b-b573-5f55-b115-000000000b00}\nParentProcessId: 4844\nParentImage: C:\\Windows\\System32\\wuauclt.exe\nParentCommandLine: "C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T04:22:11.834Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                                '5608b911376da958ed93a7f9428ad0b9',
                                '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                                'f96ec1e772808eb81774fb67a4ac229e',
                              ],
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T04:22:12.727Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              type: ['start', 'process_start'],
                              category: ['process'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '94eb7f83ddee6942ec5bdb8e218b5bc942158cb3',
                              imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              sha256:
                                '562c58193ba7878b396ebc3fb2dccece7ea0d5c6c7d52fc3ac10b62b894260eb',
                              md5: '5608b911376da958ed93a7f9428ad0b9',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'AM_Delta_Patch_1.323.673.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'M-GvaHQBA6bGZw2uBoYz',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                          'WD',
                          '/q',
                        ],
                        name: 'AM_Delta_Patch_1.323.673.0.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599484132366],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'M-GvaHQBA6bGZw2uBoYz',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                                'WD',
                                '/q',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\system32\\wuauclt.exe',
                                  '/RunHandlerComServer',
                                ],
                                name: 'wuauclt.exe',
                                pid: 4548,
                                entity_id: '{ce1d3c9b-30e3-5f56-ca15-000000000b00}',
                                executable: 'C:\\Windows\\System32\\wuauclt.exe',
                                command_line:
                                  '"C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                              },
                              pe: {
                                imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              },
                              name: 'AM_Delta_Patch_1.323.673.0.exe',
                              working_directory:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\',
                              pid: 4684,
                              entity_id: '{ce1d3c9b-30e4-5f56-cb15-000000000b00}',
                              executable:
                                'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                              command_line:
                                '"C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe" WD /q',
                              hash: {
                                sha1: 'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                                sha256:
                                  '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                                md5: 'd088fcf98bb9aa1e8f07a36b05011555',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Microsoft Antimalware WU Stub',
                                OriginalFileName: 'AM_Delta_Patch_1.323.673.0.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '1.323.693.0',
                                Product: 'Microsoft Malware Protection',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 223146,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 13:08:52.366\nProcessGuid: {ce1d3c9b-30e4-5f56-cb15-000000000b00}\nProcessId: 4684\nImage: C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe\nFileVersion: 1.323.693.0\nDescription: Microsoft Antimalware WU Stub\nProduct: Microsoft Malware Protection\nCompany: Microsoft Corporation\nOriginalFileName: AM_Delta_Patch_1.323.673.0.exe\nCommandLine: "C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe" WD /q\nCurrentDirectory: C:\\Windows\\SoftwareDistribution\\Download\\Install\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=AE1E653F1E53DCD34415A35335F9E44D2A33BE65,MD5=D088FCF98BB9AA1E8F07A36B05011555,SHA256=4382C96613850568D003C02BA0A285F6D2EF9B8C20790FFA2B35641BC831293F,IMPHASH=F96EC1E772808EB81774FB67A4AC229E\nParentProcessGuid: {ce1d3c9b-30e3-5f56-ca15-000000000b00}\nParentProcessId: 4548\nParentImage: C:\\Windows\\System32\\wuauclt.exe\nParentCommandLine: "C:\\Windows\\system32\\wuauclt.exe" /RunHandlerComServer',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T13:08:52.366Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                                'd088fcf98bb9aa1e8f07a36b05011555',
                                '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                                'f96ec1e772808eb81774fb67a4ac229e',
                              ],
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T13:08:53.889Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'ae1e653f1e53dcd34415a35335f9e44d2a33be65',
                              imphash: 'f96ec1e772808eb81774fb67a4ac229e',
                              sha256:
                                '4382c96613850568d003c02ba0a285f6d2ef9b8c20790ffa2b35641bc831293f',
                              md5: 'd088fcf98bb9aa1e8f07a36b05011555',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DeviceCensus.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'cinEZnQBB-gskclyvNmU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\devicecensus.exe'],
                        name: 'DeviceCensus.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599452000791],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'cinEZnQBB-gskclyvNmU',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\devicecensus.exe'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '0cdb6b589f0a125609d8df646de0ea86',
                              },
                              name: 'DeviceCensus.exe',
                              pid: 5016,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-b360-5f55-a115-000000000b00}',
                              executable: 'C:\\Windows\\System32\\DeviceCensus.exe',
                              command_line: 'C:\\Windows\\system32\\devicecensus.exe',
                              hash: {
                                sha1: '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                                sha256:
                                  'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                                md5: '8159944c79034d2bcabf73d461a7e643',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                Description: 'Device Census',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                OriginalFileName: 'DeviceCensus.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.18362.1035 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222507,
                              task: 'Process Create (rule: ProcessCreate)',
                              event_id: 1,
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 04:13:20.791\nProcessGuid: {ce1d3c9b-b360-5f55-a115-000000000b00}\nProcessId: 5016\nImage: C:\\Windows\\System32\\DeviceCensus.exe\nFileVersion: 10.0.18362.1035 (WinBuild.160101.0800)\nDescription: Device Census\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DeviceCensus.exe\nCommandLine: C:\\Windows\\system32\\devicecensus.exe\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=9E488437B2233E5AD9ABD3151EC28EA51EB64C2D,MD5=8159944C79034D2BCABF73D461A7E643,SHA256=DBEA7473D5E7B3B4948081DACC6E35327D5A588F4FD0A2D68184BFFD10439296,IMPHASH=0CDB6B589F0A125609D8DF646DE0EA86\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T04:13:20.791Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                                '8159944c79034d2bcabf73d461a7e643',
                                'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                                '0cdb6b589f0a125609d8df646de0ea86',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T04:13:22.458Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '9e488437b2233e5ad9abd3151ec28ea51eb64c2d',
                              imphash: '0cdb6b589f0a125609d8df646de0ea86',
                              sha256:
                                'dbea7473d5e7b3b4948081dacc6e35327d5a588f4fd0a2d68184bffd10439296',
                              md5: '8159944c79034d2bcabf73d461a7e643',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DiskSnapshot.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'HNKSZHQBA6bGZw2uCtRk',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                        name: 'DiskSnapshot.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599415124040],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'HNKSZHQBA6bGZw2uCtRk',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '69bdabb73b409f40ad05f057cec29380',
                              },
                              name: 'DiskSnapshot.exe',
                              pid: 3120,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-2354-5f55-6415-000000000b00}',
                              command_line: 'C:\\Windows\\system32\\disksnapshot.exe -z',
                              executable: 'C:\\Windows\\System32\\DiskSnapshot.exe',
                              hash: {
                                sha1: '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                                sha256:
                                  'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                                md5: 'ece311ff51bd847a3874bfac85449c6b',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'DiskSnapshot.exe',
                                OriginalFileName: 'DiskSnapshot.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.652 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 221799,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-06 17:58:44.040\nProcessGuid: {ce1d3c9b-2354-5f55-6415-000000000b00}\nProcessId: 3120\nImage: C:\\Windows\\System32\\DiskSnapshot.exe\nFileVersion: 10.0.17763.652 (WinBuild.160101.0800)\nDescription: DiskSnapshot.exe\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DiskSnapshot.exe\nCommandLine: C:\\Windows\\system32\\disksnapshot.exe -z\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=61B4D8D4757E15259E1E92C8236F37237B5380D1,MD5=ECE311FF51BD847A3874BFAC85449C6B,SHA256=C7B9591EB4DD78286615401C138C7C1A89F0E358CAAE1786DE2C3B08E904FFDC,IMPHASH=69BDABB73B409F40AD05F057CEC29380\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-06T17:58:44.040Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                                'ece311ff51bd847a3874bfac85449c6b',
                                'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                                '69bdabb73b409f40ad05f057cec29380',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-06T17:58:45.606Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '61b4d8d4757e15259e1e92c8236f37237b5380d1',
                              imphash: '69bdabb73b409f40ad05f057cec29380',
                              sha256:
                                'c7b9591eb4dd78286615401c138c7c1a89f0e358caae1786de2c3b08e904ffdc',
                              md5: 'ece311ff51bd847a3874bfac85449c6b',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DismHost.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '2zncaHQBB-gskcly1QaD',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                          '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                        ],
                        name: 'DismHost.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599487135371],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '2zncaHQBB-gskcly1QaD',
                          _score: 0,
                          _source: {
                            process: {
                              args: [
                                'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                                '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                              ],
                              parent: {
                                args: [
                                  'C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe',
                                ],
                                name: 'MsMpEng.exe',
                                pid: 184,
                                entity_id: '{ce1d3c9b-1b55-5f4f-4913-000000000b00}',
                                executable:
                                  'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2008.9-0\\MsMpEng.exe',
                                command_line:
                                  '"C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe"',
                              },
                              pe: {
                                imphash: 'a644b5814b05375757429dfb05524479',
                              },
                              name: 'DismHost.exe',
                              pid: 1500,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-3c9f-5f56-d315-000000000b00}',
                              executable:
                                'C:\\Windows\\Temp\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\DismHost.exe',
                              command_line:
                                'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe {6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                              hash: {
                                sha1: 'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                                sha256:
                                  'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                                md5: '5867dc628a444f2393f7eff007bd4417',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              name: 'siem-windows',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              type: 'winlogbeat',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'Dism Host Servicing Process',
                                OriginalFileName: 'DismHost.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.771 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 223274,
                              task: 'Process Create (rule: ProcessCreate)',
                              event_id: 1,
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 13:58:55.371\nProcessGuid: {ce1d3c9b-3c9f-5f56-d315-000000000b00}\nProcessId: 1500\nImage: C:\\Windows\\Temp\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\DismHost.exe\nFileVersion: 10.0.17763.771 (WinBuild.160101.0800)\nDescription: Dism Host Servicing Process\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: DismHost.exe\nCommandLine: C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe {6BB79B50-2038-4A10-B513-2FAC72FF213E}\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=A8A65B6A45A988F06E17EBD04E5462CA730D2337,MD5=5867DC628A444F2393F7EFF007BD4417,SHA256=B94317B7C665F1CEC965E3322E0AA26C8BE29EAF5830FB7FCD7E14AE88A8CF22,IMPHASH=A644B5814B05375757429DFB05524479\nParentProcessGuid: {ce1d3c9b-1b55-5f4f-4913-000000000b00}\nParentProcessId: 184\nParentImage: C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2008.9-0\\MsMpEng.exe\nParentCommandLine: "C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18.2008.9-0\\MsMpEng.exe"',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T13:58:55.371Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                                '5867dc628a444f2393f7eff007bd4417',
                                'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                                'a644b5814b05375757429dfb05524479',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T13:58:56.138Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'a8a65b6a45a988f06e17ebd04e5462ca730d2337',
                              imphash: 'a644b5814b05375757429dfb05524479',
                              sha256:
                                'b94317b7c665f1cec965e3322e0aa26c8be29eaf5830fb7fcd7e14ae88a8cf22',
                              md5: '5867dc628a444f2393f7eff007bd4417',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SIHClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'gdVuZXQBA6bGZw2uFsPP',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\System32\\sihclient.exe',
                          '/cv',
                          '33nfV21X50ie84HvATAt1w.0.1',
                        ],
                        name: 'SIHClient.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599429545370],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'gdVuZXQBA6bGZw2uFsPP',
                          _score: 0,
                          _source: {
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            process: {
                              args: [
                                'C:\\Windows\\System32\\sihclient.exe',
                                '/cv',
                                '33nfV21X50ie84HvATAt1w.0.1',
                              ],
                              parent: {
                                args: [
                                  'C:\\Windows\\System32\\Upfc.exe',
                                  '/launchtype',
                                  'periodic',
                                  '/cv',
                                  '33nfV21X50ie84HvATAt1w.0',
                                ],
                                name: 'upfc.exe',
                                pid: 4328,
                                entity_id: '{ce1d3c9b-5b8b-5f55-7815-000000000b00}',
                                executable: 'C:\\Windows\\System32\\upfc.exe',
                                command_line:
                                  'C:\\Windows\\System32\\Upfc.exe /launchtype periodic /cv 33nfV21X50ie84HvATAt1w.0',
                              },
                              pe: {
                                imphash: '3bbd1eea2778ee3dcd883a4d5533aec3',
                              },
                              name: 'SIHClient.exe',
                              pid: 2780,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-5ba9-5f55-8815-000000000b00}',
                              executable: 'C:\\Windows\\System32\\SIHClient.exe',
                              command_line:
                                'C:\\Windows\\System32\\sihclient.exe  /cv 33nfV21X50ie84HvATAt1w.0.1',
                              hash: {
                                sha1: '145ef8d82cf1e451381584cd9565a2d35a442504',
                                sha256:
                                  '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                                md5: 'dc1e380b36f4a8309f363d3809e607b8',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                Description: 'SIH Client',
                                OriginalFileName: 'sihclient.exe',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.1217 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222106,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-06 21:59:05.370\nProcessGuid: {ce1d3c9b-5ba9-5f55-8815-000000000b00}\nProcessId: 2780\nImage: C:\\Windows\\System32\\SIHClient.exe\nFileVersion: 10.0.17763.1217 (WinBuild.160101.0800)\nDescription: SIH Client\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: sihclient.exe\nCommandLine: C:\\Windows\\System32\\sihclient.exe  /cv 33nfV21X50ie84HvATAt1w.0.1\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=145EF8D82CF1E451381584CD9565A2D35A442504,MD5=DC1E380B36F4A8309F363D3809E607B8,SHA256=0E0BB70AE1888060B3FFB9A320963551B56DD0D4CE0B5DC1C8FADDA4B7BF3F6A,IMPHASH=3BBD1EEA2778EE3DCD883A4D5533AEC3\nParentProcessGuid: {ce1d3c9b-5b8b-5f55-7815-000000000b00}\nParentProcessId: 4328\nParentImage: C:\\Windows\\System32\\upfc.exe\nParentCommandLine: C:\\Windows\\System32\\Upfc.exe /launchtype periodic /cv 33nfV21X50ie84HvATAt1w.0',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-06T21:59:05.370Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                '145ef8d82cf1e451381584cd9565a2d35a442504',
                                'dc1e380b36f4a8309f363d3809e607b8',
                                '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                                '3bbd1eea2778ee3dcd883a4d5533aec3',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              kind: 'event',
                              created: '2020-09-06T21:59:06.713Z',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: '145ef8d82cf1e451381584cd9565a2d35a442504',
                              imphash: '3bbd1eea2778ee3dcd883a4d5533aec3',
                              sha256:
                                '0e0bb70ae1888060b3ffb9a320963551b56dd0d4ce0b5dc1c8fadda4b7bf3f6a',
                              md5: 'dc1e380b36f4a8309f363d3809e607b8',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SpeechModelDownload.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '6NmKZnQBA6bGZw2uma12',
                    _score: null,
                    _source: {
                      process: {
                        args: [
                          'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                        ],
                        name: 'SpeechModelDownload.exe',
                      },
                      user: {
                        name: 'NETWORK SERVICE',
                      },
                    },
                    sort: [1599448191225],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '6NmKZnQBA6bGZw2uma12',
                          _score: 0,
                          _source: {
                            process: {
                              args: [
                                'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                              ],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '23bd5f904494d14029d9263cebae088d',
                              },
                              name: 'SpeechModelDownload.exe',
                              working_directory: 'C:\\Windows\\system32\\',
                              pid: 4328,
                              entity_id: '{ce1d3c9b-a47f-5f55-9915-000000000b00}',
                              hash: {
                                sha1: '03e6e81192621dfd873814de3787c6e7d6af1509',
                                sha256:
                                  '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                                md5: '3fd687e97e03d303e02bb37ec85de962',
                              },
                              executable:
                                'C:\\Windows\\System32\\Speech_OneCore\\common\\SpeechModelDownload.exe',
                              command_line:
                                'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                LogonGuid: '{ce1d3c9b-b9ac-5f34-e403-000000000000}',
                                Description: 'Speech Model Download Executable',
                                OriginalFileName: 'SpeechModelDownload.exe',
                                IntegrityLevel: 'System',
                                TerminalSessionId: '0',
                                FileVersion: '10.0.17763.1369 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e4',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222431,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 03:09:51.225\nProcessGuid: {ce1d3c9b-a47f-5f55-9915-000000000b00}\nProcessId: 4328\nImage: C:\\Windows\\System32\\Speech_OneCore\\common\\SpeechModelDownload.exe\nFileVersion: 10.0.17763.1369 (WinBuild.160101.0800)\nDescription: Speech Model Download Executable\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: SpeechModelDownload.exe\nCommandLine: C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\NETWORK SERVICE\nLogonGuid: {ce1d3c9b-b9ac-5f34-e403-000000000000}\nLogonId: 0x3E4\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=03E6E81192621DFD873814DE3787C6E7D6AF1509,MD5=3FD687E97E03D303E02BB37EC85DE962,SHA256=963FD9DC1B82C44D00EB91D61E2CB442AF7357E3A603C23D469DF53A6376F073,IMPHASH=23BD5F904494D14029D9263CEBAE088D\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T03:09:51.225Z',
                            related: {
                              user: 'NETWORK SERVICE',
                              hash: [
                                '03e6e81192621dfd873814de3787c6e7d6af1509',
                                '3fd687e97e03d303e02bb37ec85de962',
                                '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                                '23bd5f904494d14029d9263cebae088d',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              kind: 'event',
                              created: '2020-09-07T03:09:52.370Z',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              type: ['start', 'process_start'],
                              category: ['process'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'NETWORK SERVICE',
                            },
                            hash: {
                              sha1: '03e6e81192621dfd873814de3787c6e7d6af1509',
                              imphash: '23bd5f904494d14029d9263cebae088d',
                              sha256:
                                '963fd9dc1b82c44d00eb91d61e2cb442af7357e3a603c23d469df53a6376f073',
                              md5: '3fd687e97e03d303e02bb37ec85de962',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'UsoClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'Pi68Z3QBc39KFIJb3txa',
                    _score: null,
                    _source: {
                      process: {
                        args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                        name: 'UsoClient.exe',
                      },
                      user: {
                        name: 'SYSTEM',
                      },
                    },
                    sort: [1599468262455],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'Pi68Z3QBc39KFIJb3txa',
                          _score: 0,
                          _source: {
                            process: {
                              args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                              parent: {
                                args: ['C:\\Windows\\system32\\svchost.exe', '-k', 'netsvcs', '-p'],
                                name: 'svchost.exe',
                                pid: 1060,
                                entity_id: '{ce1d3c9b-b9b1-5f34-1c00-000000000b00}',
                                executable: 'C:\\Windows\\System32\\svchost.exe',
                                command_line: 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                              },
                              pe: {
                                imphash: '2510e8a4554aef2caf0a913be015929f',
                              },
                              name: 'UsoClient.exe',
                              pid: 3864,
                              working_directory: 'C:\\Windows\\system32\\',
                              entity_id: '{ce1d3c9b-f2e6-5f55-bc15-000000000b00}',
                              command_line: 'C:\\Windows\\system32\\usoclient.exe StartScan',
                              executable: 'C:\\Windows\\System32\\UsoClient.exe',
                              hash: {
                                sha1: 'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                                sha256:
                                  'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                                md5: '39750d33d277617b322adbb917f7b626',
                              },
                            },
                            agent: {
                              build_date: '2020-07-16 09:16:27 +0000 UTC ',
                              commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                              name: 'siem-windows',
                              id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                              ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                              type: 'winlogbeat',
                              version: '8.0.0',
                              user: {
                                name: 'inside_winlogbeat_user',
                              },
                            },
                            winlog: {
                              computer_name: 'siem-windows',
                              process: {
                                pid: 1252,
                                thread: {
                                  id: 2896,
                                },
                              },
                              channel: 'Microsoft-Windows-Sysmon/Operational',
                              event_data: {
                                Company: 'Microsoft Corporation',
                                Description: 'UsoClient',
                                LogonGuid: '{ce1d3c9b-b9a7-5f34-e703-000000000000}',
                                OriginalFileName: 'UsoClient',
                                TerminalSessionId: '0',
                                IntegrityLevel: 'System',
                                FileVersion: '10.0.17763.1007 (WinBuild.160101.0800)',
                                Product: 'Microsoft® Windows® Operating System',
                                LogonId: '0x3e7',
                                RuleName: '-',
                              },
                              opcode: 'Info',
                              version: 5,
                              record_id: 222846,
                              event_id: 1,
                              task: 'Process Create (rule: ProcessCreate)',
                              provider_guid: '{5770385f-c22a-43e0-bf4c-06f5698ffbd9}',
                              api: 'wineventlog',
                              provider_name: 'Microsoft-Windows-Sysmon',
                              user: {
                                identifier: 'S-1-5-18',
                                domain: 'NT AUTHORITY',
                                name: 'SYSTEM',
                                type: 'User',
                              },
                            },
                            log: {
                              level: 'information',
                            },
                            message:
                              'Process Create:\nRuleName: -\nUtcTime: 2020-09-07 08:44:22.455\nProcessGuid: {ce1d3c9b-f2e6-5f55-bc15-000000000b00}\nProcessId: 3864\nImage: C:\\Windows\\System32\\UsoClient.exe\nFileVersion: 10.0.17763.1007 (WinBuild.160101.0800)\nDescription: UsoClient\nProduct: Microsoft® Windows® Operating System\nCompany: Microsoft Corporation\nOriginalFileName: UsoClient\nCommandLine: C:\\Windows\\system32\\usoclient.exe StartScan\nCurrentDirectory: C:\\Windows\\system32\\\nUser: NT AUTHORITY\\SYSTEM\nLogonGuid: {ce1d3c9b-b9a7-5f34-e703-000000000000}\nLogonId: 0x3E7\nTerminalSessionId: 0\nIntegrityLevel: System\nHashes: SHA1=EBF56AD89D4740359D5D3D5370B31E56614BBB79,MD5=39750D33D277617B322ADBB917F7B626,SHA256=DF3900CDC3C6F023037AAF2D4407C4E8AAA909013A69539FB4688E2BD099DB85,IMPHASH=2510E8A4554AEF2CAF0A913BE015929F\nParentProcessGuid: {ce1d3c9b-b9b1-5f34-1c00-000000000b00}\nParentProcessId: 1060\nParentImage: C:\\Windows\\System32\\svchost.exe\nParentCommandLine: C:\\Windows\\system32\\svchost.exe -k netsvcs -p',
                            cloud: {
                              availability_zone: 'us-central1-c',
                              instance: {
                                name: 'siem-windows',
                                id: '9156726559029788564',
                              },
                              provider: 'gcp',
                              machine: {
                                type: 'g1-small',
                              },
                              project: {
                                id: 'elastic-siem',
                              },
                            },
                            '@timestamp': '2020-09-07T08:44:22.455Z',
                            related: {
                              user: 'SYSTEM',
                              hash: [
                                'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                                '39750d33d277617b322adbb917f7b626',
                                'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                                '2510e8a4554aef2caf0a913be015929f',
                              ],
                            },
                            ecs: {
                              version: '1.5.0',
                            },
                            host: {
                              hostname: 'siem-windows',
                              os: {
                                build: '17763.1397',
                                kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                                name: 'Windows Server 2019 Datacenter',
                                family: 'windows',
                                version: '10.0',
                                platform: 'windows',
                              },
                              ip: ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                              name: 'siem-windows',
                              id: 'ce1d3c9b-a815-4643-9641-ada0f2c00609',
                              mac: ['42:01:0a:c8:00:0f'],
                              architecture: 'x86_64',
                            },
                            event: {
                              code: 1,
                              provider: 'Microsoft-Windows-Sysmon',
                              created: '2020-09-07T08:44:24.029Z',
                              kind: 'event',
                              module: 'sysmon',
                              action: 'Process Create (rule: ProcessCreate)',
                              category: ['process'],
                              type: ['start', 'process_start'],
                            },
                            user: {
                              domain: 'NT AUTHORITY',
                              name: 'SYSTEM',
                            },
                            hash: {
                              sha1: 'ebf56ad89d4740359d5d3d5370b31e56614bbb79',
                              imphash: '2510e8a4554aef2caf0a913be015929f',
                              sha256:
                                'df3900cdc3c6f023037aaf2d4407c4e8aaa909013a69539fb4688e2bd099db85',
                              md5: '39750d33d277617b322adbb917f7b626',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'apt-compat',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'Ziw-Z3QBB-gskcly0vqU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['/etc/cron.daily/apt-compat'],
                        name: 'apt-compat',
                      },
                      user: {
                        name: 'root',
                        id: 0,
                      },
                    },
                    sort: [1599459901154],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'Ziw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          _source: {
                            agent: {
                              id: 'b1e3298e-10be-4032-b1ee-5a4cbb280aa1',
                              type: 'endpoint',
                              version: '7.9.1',
                            },
                            process: {
                              Ext: {
                                ancestry: [
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjUzOTIzMzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUzMjIzMTAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUyODg0MzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUyMDI5ODAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUwNzM4MjAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODU5LTEzMjQzOTMzNTAxLjc3NTM1MDAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTUyNC0xMzIzNjA4NTMzMC4w',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEtMTMyMzYwODUzMjIuMA==',
                                ],
                              },
                              args: ['/etc/cron.daily/apt-compat'],
                              parent: {
                                name: 'run-parts',
                                pid: 13861,
                                entity_id:
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjUzOTIzMzAw',
                                executable: '/bin/run-parts',
                              },
                              name: 'apt-compat',
                              pid: 13862,
                              args_count: 1,
                              entity_id:
                                'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYyLTEzMjQzOTMzNTAxLjU0NDY0MDAw',
                              command_line: '/etc/cron.daily/apt-compat',
                              executable: '/etc/cron.daily/apt-compat',
                              hash: {
                                sha1: '61445721d0b5d86ac0a8386a4ceef450118f4fbb',
                                sha256:
                                  '8eeae3a9df22621d51062e4dadfc5c63b49732b38a37b5d4e52c99c2237e5767',
                                md5: 'bc4a71cbcaeed4179f25d798257fa980',
                              },
                            },
                            message: 'Endpoint process event',
                            '@timestamp': '2020-09-07T06:25:01.154464000Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            data_stream: {
                              namespace: 'default',
                              type: 'logs',
                              dataset: 'endpoint.events.process',
                            },
                            elastic: {
                              agent: {
                                id: 'ebee9a13-9ae3-4a55-9cb7-72ddf053055f',
                              },
                            },
                            host: {
                              hostname: 'siem-kibana',
                              os: {
                                Ext: {
                                  variant: 'Debian',
                                },
                                kernel: '4.9.0-8-amd64 #1 SMP Debian 4.9.130-2 (2018-10-27)',
                                name: 'Linux',
                                family: 'debian',
                                version: '9',
                                platform: 'debian',
                                full: 'Debian 9',
                              },
                              ip: ['127.0.0.1', '::1', '10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                              name: 'siem-kibana',
                              id: 'e50acb49-820b-c60a-392d-2ef75f276301',
                              mac: ['42:01:0a:8e:00:07'],
                              architecture: 'x86_64',
                            },
                            event: {
                              sequence: 197060,
                              ingested: '2020-09-07T06:26:44.476888Z',
                              created: '2020-09-07T06:25:01.154464000Z',
                              kind: 'event',
                              module: 'endpoint',
                              action: 'exec',
                              id: 'Lp6oofT0fzv0Auzq+++/kwCO',
                              category: ['process'],
                              type: ['start'],
                              dataset: 'endpoint.events.process',
                            },
                            user: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                            group: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'bsdmainutils',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'aSw-Z3QBB-gskcly0vqU',
                    _score: null,
                    _source: {
                      process: {
                        args: ['/etc/cron.daily/bsdmainutils'],
                        name: 'bsdmainutils',
                      },
                      user: {
                        name: 'root',
                        id: 0,
                      },
                    },
                    sort: [1599459901155],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'aSw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          _source: {
                            agent: {
                              id: 'b1e3298e-10be-4032-b1ee-5a4cbb280aa1',
                              type: 'endpoint',
                              version: '7.9.1',
                            },
                            process: {
                              Ext: {
                                ancestry: [
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1MzMwMzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUzMjIzMTAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYxLTEzMjQzOTMzNTAxLjUyODg0MzAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUyMDI5ODAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYwLTEzMjQzOTMzNTAxLjUwNzM4MjAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODU5LTEzMjQzOTMzNTAxLjc3NTM1MDAw',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTUyNC0xMzIzNjA4NTMzMC4w',
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEtMTMyMzYwODUzMjIuMA==',
                                ],
                              },
                              args: ['/etc/cron.daily/bsdmainutils'],
                              parent: {
                                name: 'run-parts',
                                pid: 13861,
                                entity_id:
                                  'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1MzMwMzAw',
                                executable: '/bin/run-parts',
                              },
                              name: 'bsdmainutils',
                              pid: 13863,
                              args_count: 1,
                              entity_id:
                                'YjFlMzI5OGUtMTBiZS00MDMyLWIxZWUtNWE0Y2JiMjgwYWExLTEzODYzLTEzMjQzOTMzNTAxLjU1ODEyMDAw',
                              command_line: '/etc/cron.daily/bsdmainutils',
                              executable: '/etc/cron.daily/bsdmainutils',
                              hash: {
                                sha1: 'fd24f1f3986e5527e804c4dccddee29ff42cb682',
                                sha256:
                                  'a68002bf1dc9f42a150087b00437448a46f7cae6755ecddca70a6d3c9d20a14b',
                                md5: '559387f792462a62e3efb1d573e38d11',
                              },
                            },
                            message: 'Endpoint process event',
                            '@timestamp': '2020-09-07T06:25:01.155812000Z',
                            ecs: {
                              version: '1.5.0',
                            },
                            data_stream: {
                              namespace: 'default',
                              type: 'logs',
                              dataset: 'endpoint.events.process',
                            },
                            elastic: {
                              agent: {
                                id: 'ebee9a13-9ae3-4a55-9cb7-72ddf053055f',
                              },
                            },
                            host: {
                              hostname: 'siem-kibana',
                              os: {
                                Ext: {
                                  variant: 'Debian',
                                },
                                kernel: '4.9.0-8-amd64 #1 SMP Debian 4.9.130-2 (2018-10-27)',
                                name: 'Linux',
                                family: 'debian',
                                version: '9',
                                platform: 'debian',
                                full: 'Debian 9',
                              },
                              ip: ['127.0.0.1', '::1', '10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                              name: 'siem-kibana',
                              id: 'e50acb49-820b-c60a-392d-2ef75f276301',
                              mac: ['42:01:0a:8e:00:07'],
                              architecture: 'x86_64',
                            },
                            event: {
                              sequence: 197063,
                              ingested: '2020-09-07T06:26:44.477164Z',
                              created: '2020-09-07T06:25:01.155812000Z',
                              kind: 'event',
                              module: 'endpoint',
                              action: 'exec',
                              id: 'Lp6oofT0fzv0Auzq+++/kwCZ',
                              category: ['process'],
                              type: ['start'],
                              dataset: 'endpoint.events.process',
                            },
                            user: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                            group: {
                              Ext: {
                                real: {
                                  name: 'root',
                                  id: 0,
                                },
                              },
                              name: 'root',
                              id: 0,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
  edges: [
    {
      node: {
        _id: 'ayrMZnQBB-gskcly0w7l',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
            'WD',
            '/q',
          ],
          name: ['AM_Delta_Patch_1.323.631.0.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'M-GvaHQBA6bGZw2uBoYz',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
            'WD',
            '/q',
          ],
          name: ['AM_Delta_Patch_1.323.673.0.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'cinEZnQBB-gskclyvNmU',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\devicecensus.exe'],
          name: ['DeviceCensus.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'HNKSZHQBA6bGZw2uCtRk',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
          name: ['DiskSnapshot.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '2zncaHQBB-gskcly1QaD',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
            '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
          ],
          name: ['DismHost.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'gdVuZXQBA6bGZw2uFsPP',
        instances: 1,
        process: {
          args: ['C:\\Windows\\System32\\sihclient.exe', '/cv', '33nfV21X50ie84HvATAt1w.0.1'],
          name: ['SIHClient.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '6NmKZnQBA6bGZw2uma12',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe'],
          name: ['SpeechModelDownload.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['NETWORK SERVICE'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'Pi68Z3QBc39KFIJb3txa',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
          name: ['UsoClient.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          id: [],
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'Ziw-Z3QBB-gskcly0vqU',
        instances: 1,
        process: {
          args: ['/etc/cron.daily/apt-compat'],
          name: ['apt-compat'],
        },
        hosts: [
          {
            id: ['siem-kibana'],
            name: ['siem-kibana'],
          },
        ],
        user: {
          id: ['0'],
          name: ['root'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'aSw-Z3QBB-gskcly0vqU',
        instances: 1,
        process: {
          args: ['/etc/cron.daily/bsdmainutils'],
          name: ['bsdmainutils'],
        },
        hosts: [
          {
            id: ['siem-kibana'],
            name: ['siem-kibana'],
          },
        ],
        user: {
          id: ['0'],
          name: ['root'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
  ],
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allow_no_indices: true,
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignore_unavailable: true,
          body: {
            aggregations: {
              process_count: { cardinality: { field: 'process.name' } },
              group_by_process: {
                terms: {
                  size: 10,
                  field: 'process.name',
                  order: [{ host_count: 'asc' }, { _count: 'asc' }, { _key: 'asc' }],
                },
                aggregations: {
                  process: {
                    top_hits: {
                      size: 1,
                      sort: [{ '@timestamp': { order: 'desc' } }],
                      _source: ['process.args', 'process.name', 'user.id', 'user.name'],
                    },
                  },
                  host_count: { cardinality: { field: 'host.name' } },
                  hosts: {
                    terms: { field: 'host.name' },
                    aggregations: { host: { top_hits: { size: 1, _source: [] } } },
                  },
                },
              },
            },
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'auditbeat' } },
                        { term: { 'event.module': 'auditd' } },
                        { term: { 'event.action': 'executed' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'auditbeat' } },
                        { term: { 'event.module': 'system' } },
                        { term: { 'event.dataset': 'process' } },
                        { term: { 'event.action': 'process_started' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'winlogbeat' } },
                        { term: { 'event.code': '4688' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'winlog.event_id': 1 } },
                        { term: { 'winlog.channel': 'Microsoft-Windows-Sysmon/Operational' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'event.type': 'process_start' } },
                        { term: { 'event.category': 'process' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'event.category': 'process' } },
                        { term: { 'event.type': 'start' } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
                filter: [
                  {
                    bool: {
                      must: [],
                      filter: [
                        { match_all: {} },
                        { match_phrase: { 'host.name': { query: 'siem-kibana' } } },
                      ],
                      should: [],
                      must_not: [],
                    },
                  },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-06T15:23:52.757Z',
                        lte: '2020-09-07T15:23:52.757Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
          },
          size: 0,
          track_total_hits: false,
        },
        null,
        2
      ),
    ],
  },
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 50,
    showMorePagesIndicator: true,
  },
  totalCount: 92,
};

export const expectedDsl = {
  allow_no_indices: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignore_unavailable: true,
  body: {
    aggregations: {
      process_count: { cardinality: { field: 'process.name' } },
      group_by_process: {
        terms: {
          size: 10,
          field: 'process.name',
          order: [{ host_count: 'asc' }, { _count: 'asc' }, { _key: 'asc' }],
        },
        aggregations: {
          process: {
            top_hits: {
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
              _source: ['process.args', 'process.name', 'user.id', 'user.name'],
            },
          },
          host_count: { cardinality: { field: 'host.name' } },
          hosts: {
            terms: { field: 'host.name' },
            aggregations: { host: { top_hits: { size: 1, _source: [] } } },
          },
        },
      },
    },
    query: {
      bool: {
        should: [
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'auditbeat' } },
                { term: { 'event.module': 'auditd' } },
                { term: { 'event.action': 'executed' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'auditbeat' } },
                { term: { 'event.module': 'system' } },
                { term: { 'event.dataset': 'process' } },
                { term: { 'event.action': 'process_started' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'winlogbeat' } },
                { term: { 'event.code': '4688' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'winlog.event_id': 1 } },
                { term: { 'winlog.channel': 'Microsoft-Windows-Sysmon/Operational' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'event.type': 'process_start' } },
                { term: { 'event.category': 'process' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'event.category': 'process' } },
                { term: { 'event.type': 'start' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
        filter: [
          {
            bool: {
              must: [],
              filter: [
                { match_all: {} },
                { match_phrase: { 'host.name': { query: 'siem-kibana' } } },
              ],
              should: [],
              must_not: [],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-06T15:23:52.757Z',
                lte: '2020-09-07T15:23:52.757Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  },
  size: 0,
  track_total_hits: false,
};
