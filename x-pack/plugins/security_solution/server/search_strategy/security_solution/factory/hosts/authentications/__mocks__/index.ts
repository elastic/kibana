/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  HostsQueries,
} from '../../../../../../../common/search_strategy/security_solution';
import { AuthenticationsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts/authentications';

export const mockOptions: AuthenticationsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  docValueFields: [
    {
      field: '@timestamp',
      format: 'date_time',
    },
    {
      field: 'event.created',
      format: 'date_time',
    },
    {
      field: 'event.end',
      format: 'date_time',
    },
    {
      field: 'event.ingested',
      format: 'date_time',
    },
    {
      field: 'event.start',
      format: 'date_time',
    },
    {
      field: 'file.accessed',
      format: 'date_time',
    },
    {
      field: 'file.created',
      format: 'date_time',
    },
    {
      field: 'file.ctime',
      format: 'date_time',
    },
    {
      field: 'file.mtime',
      format: 'date_time',
    },
    {
      field: 'package.installed',
      format: 'date_time',
    },
    {
      field: 'process.parent.start',
      format: 'date_time',
    },
    {
      field: 'process.start',
      format: 'date_time',
    },
    {
      field: 'system.audit.host.boottime',
      format: 'date_time',
    },
    {
      field: 'system.audit.package.installtime',
      format: 'date_time',
    },
    {
      field: 'system.audit.user.password.last_changed',
      format: 'date_time',
    },
    {
      field: 'tls.client.not_after',
      format: 'date_time',
    },
    {
      field: 'tls.client.not_before',
      format: 'date_time',
    },
    {
      field: 'tls.server.not_after',
      format: 'date_time',
    },
    {
      field: 'tls.server.not_before',
      format: 'date_time',
    },
    {
      field: 'aws.cloudtrail.user_identity.session_context.creation_date',
      format: 'date_time',
    },
    {
      field: 'azure.auditlogs.properties.activity_datetime',
      format: 'date_time',
    },
    {
      field: 'azure.enqueued_time',
      format: 'date_time',
    },
    {
      field: 'azure.signinlogs.properties.created_at',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.agentReceiptTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.deviceCustomDate1',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.deviceCustomDate2',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.deviceReceiptTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.endTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.fileCreateTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.fileModificationTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.flexDate1',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.managerReceiptTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.oldFileCreateTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.oldFileModificationTime',
      format: 'date_time',
    },
    {
      field: 'cef.extensions.startTime',
      format: 'date_time',
    },
    {
      field: 'checkpoint.subs_exp',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.EndTimestamp',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.IncidentEndTime',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.IncidentStartTime',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.ProcessEndTime',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.ProcessStartTime',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.StartTimestamp',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.Timestamp',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.event.UTCTimestamp',
      format: 'date_time',
    },
    {
      field: 'crowdstrike.metadata.eventCreationTime',
      format: 'date_time',
    },
    {
      field: 'gsuite.admin.email.log_search_filter.end_date',
      format: 'date_time',
    },
    {
      field: 'gsuite.admin.email.log_search_filter.start_date',
      format: 'date_time',
    },
    {
      field: 'gsuite.admin.user.birthdate',
      format: 'date_time',
    },
    {
      field: 'kafka.block_timestamp',
      format: 'date_time',
    },
    {
      field: 'microsoft.defender_atp.lastUpdateTime',
      format: 'date_time',
    },
    {
      field: 'microsoft.defender_atp.resolvedTime',
      format: 'date_time',
    },
    {
      field: 'misp.campaign.first_seen',
      format: 'date_time',
    },
    {
      field: 'misp.campaign.last_seen',
      format: 'date_time',
    },
    {
      field: 'misp.intrusion_set.first_seen',
      format: 'date_time',
    },
    {
      field: 'misp.intrusion_set.last_seen',
      format: 'date_time',
    },
    {
      field: 'misp.observed_data.first_observed',
      format: 'date_time',
    },
    {
      field: 'misp.observed_data.last_observed',
      format: 'date_time',
    },
    {
      field: 'misp.report.published',
      format: 'date_time',
    },
    {
      field: 'misp.threat_indicator.valid_from',
      format: 'date_time',
    },
    {
      field: 'misp.threat_indicator.valid_until',
      format: 'date_time',
    },
    {
      field: 'netflow.collection_time_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.exporter.timestamp',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_end_microseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_end_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_end_nanoseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_end_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_start_microseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_start_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_start_nanoseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.flow_start_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.max_export_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.max_flow_end_microseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.max_flow_end_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.max_flow_end_nanoseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.max_flow_end_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.min_export_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.min_flow_start_microseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.min_flow_start_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.min_flow_start_nanoseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.min_flow_start_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.monitoring_interval_end_milli_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.monitoring_interval_start_milli_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.observation_time_microseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.observation_time_milliseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.observation_time_nanoseconds',
      format: 'date_time',
    },
    {
      field: 'netflow.observation_time_seconds',
      format: 'date_time',
    },
    {
      field: 'netflow.system_init_time_milliseconds',
      format: 'date_time',
    },
    {
      field: 'rsa.internal.lc_ctime',
      format: 'date_time',
    },
    {
      field: 'rsa.internal.time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.effective_time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.endtime',
      format: 'date_time',
    },
    {
      field: 'rsa.time.event_queue_time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.event_time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.expire_time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.recorded_time',
      format: 'date_time',
    },
    {
      field: 'rsa.time.stamp',
      format: 'date_time',
    },
    {
      field: 'rsa.time.starttime',
      format: 'date_time',
    },
    {
      field: 'sophos.xg.date',
      format: 'date_time',
    },
    {
      field: 'sophos.xg.eventtime',
      format: 'date_time',
    },
    {
      field: 'sophos.xg.start_time',
      format: 'date_time',
    },
  ],
  factoryQueryType: HostsQueries.authentications,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  timerange: {
    interval: '12h',
    from: '2020-09-02T15:17:13.678Z',
    to: '2020-09-03T15:17:13.678Z',
  },
  sort: {
    direction: Direction.desc,
    field: 'success',
  },
  params: {},
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 14,
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
      group_by_users: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 232,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 322,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              meta: {},
              doc_count: 4,
              lastSuccess: {
                hits: {
                  total: 4,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                      _id: 'DvFDVHQBc39KFIJbC_P4',
                      _score: null,
                      _source: {
                        process: {
                          name: 'services.exe',
                          pid: 564,
                          executable: 'C:\\Windows\\System32\\services.exe',
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
                            pid: 576,
                            thread: {
                              id: 2372,
                            },
                          },
                          keywords: ['Audit Success'],
                          logon: {
                            id: '0x3e7',
                            type: 'Service',
                          },
                          channel: 'Security',
                          event_data: {
                            LogonGuid: '{00000000-0000-0000-0000-000000000000}',
                            TargetOutboundDomainName: '-',
                            VirtualAccount: '%%1843',
                            LogonType: '5',
                            IpPort: '-',
                            TransmittedServices: '-',
                            SubjectLogonId: '0x3e7',
                            LmPackageName: '-',
                            TargetOutboundUserName: '-',
                            KeyLength: '0',
                            TargetLogonId: '0x3e7',
                            RestrictedAdminMode: '-',
                            TargetLinkedLogonId: '0x0',
                            SubjectUserName: 'SIEM-WINDOWS$',
                            ElevatedToken: '%%1842',
                            SubjectDomainName: 'WORKGROUP',
                            IpAddress: '-',
                            TargetUserName: 'SYSTEM',
                            ImpersonationLevel: '%%1833',
                            LogonProcessName: 'Advapi  ',
                            TargetDomainName: 'NT AUTHORITY',
                            SubjectUserSid: 'S-1-5-18',
                            AuthenticationPackageName: 'Negotiate',
                            TargetUserSid: 'S-1-5-18',
                          },
                          opcode: 'Info',
                          version: 2,
                          record_id: 57778,
                          task: 'Logon',
                          event_id: 4624,
                          provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
                          activity_id: '{d2485217-6bac-0000-8fbb-3f7e2571d601}',
                          api: 'wineventlog',
                          provider_name: 'Microsoft-Windows-Security-Auditing',
                        },
                        log: {
                          level: 'information',
                        },
                        source: {
                          domain: '-',
                        },
                        message:
                          'An account was successfully logged on.\n\nSubject:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSIEM-WINDOWS$\n\tAccount Domain:\t\tWORKGROUP\n\tLogon ID:\t\t0x3E7\n\nLogon Information:\n\tLogon Type:\t\t5\n\tRestricted Admin Mode:\t-\n\tVirtual Account:\t\tNo\n\tElevated Token:\t\tYes\n\nImpersonation Level:\t\tImpersonation\n\nNew Logon:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSYSTEM\n\tAccount Domain:\t\tNT AUTHORITY\n\tLogon ID:\t\t0x3E7\n\tLinked Logon ID:\t\t0x0\n\tNetwork Account Name:\t-\n\tNetwork Account Domain:\t-\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\n\nProcess Information:\n\tProcess ID:\t\t0x234\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t-\n\tSource Port:\t\t-\n\nDetailed Authentication Information:\n\tLogon Process:\t\tAdvapi  \n\tAuthentication Package:\tNegotiate\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\n\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\n\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\n\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe impersonation level field indicates the extent to which a process in the logon session can impersonate.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
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
                        '@timestamp': '2020-09-03T13:58:31.888Z',
                        related: {
                          user: ['SYSTEM', 'SIEM-WINDOWS$'],
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
                          code: 4624,
                          provider: 'Microsoft-Windows-Security-Auditing',
                          created: '2020-09-03T13:58:33.229Z',
                          kind: 'event',
                          module: 'security',
                          action: 'logged-in',
                          category: 'authentication',
                          type: 'start',
                          outcome: 'success',
                        },
                        user: {
                          domain: 'NT AUTHORITY',
                          name: 'SYSTEM',
                          id: 'S-1-5-18',
                        },
                      },
                      sort: [1599141511888],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'zeus',
            doc_count: 3,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 3,
              lastSuccess: {
                hits: {
                  total: 3,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '6pGDUHQBA6bGZw2ugbZe',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          name: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          id: '6efda877-cb4d-45b5-84b5-d56934d5e352',
                          ephemeral_id: '256fa22a-a0dd-4269-9d84-1c70ad27ecb8',
                          type: 'filebeat',
                          version: '7.9.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 30023,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 18175,
                        },
                        source: {
                          port: 53766,
                          ip: '10.0.7.195',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-02T16:30:20.000-04:00',
                        system: {
                          auth: {
                            ssh: {
                              method: 'password',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['10.0.7.195'],
                          user: ['zeus'],
                        },
                        data_stream: {
                          namespace: 'default',
                          type: 'logs',
                          dataset: 'system.auth',
                        },
                        host: {
                          hostname: 'mainqa-atlcolo-10-0-7-158',
                          os: {
                            kernel: '4.15.0-38-generic',
                            codename: 'bionic',
                            name: 'Ubuntu',
                            family: 'debian',
                            version: '18.04.1 LTS (Bionic Beaver)',
                            platform: 'ubuntu',
                          },
                          containerized: false,
                          ip: [
                            '10.0.7.158',
                            'fdbb:cb5c:fb4:68:250:56ff:feb1:371f',
                            'fe80::250:56ff:feb1:371f',
                          ],
                          name: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          id: '739e447fc6963034621b714c584eccc1',
                          mac: ['00:50:56:b1:37:1f'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '-04:00',
                          kind: 'event',
                          action: 'ssh_login',
                          type: ['authentication_success', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: {
                          name: 'zeus',
                        },
                      },
                      sort: [1599078620000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'akroh',
            doc_count: 2,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 2,
              lastSuccess: {
                hits: {
                  total: 2,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '2Y6qT3QBA6bGZw2uWR5d',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'kibana00.siem.estc.dev',
                          id: '3420c5de-8bc6-4f04-a6d7-4e38cb0308d2',
                          type: 'filebeat',
                          ephemeral_id: 'af6bf0d3-edc3-44fb-8e1d-efbb6d1573d2',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 15119,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 71181,
                        },
                        source: {
                          port: 43576,
                          ip: '10.200.0.14',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-02T16:33:14.000Z',
                        system: {
                          auth: {
                            ssh: {
                              method: 'publickey',
                              signature: 'RSA SHA256:5+CmAa8Igw+d5Ho0myKKBP2XCQWGJMxrIZGzE38li0Y',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['10.200.0.14'],
                          user: ['akroh'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'kibana00',
                          name: 'kibana00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-02T16:33:18.169833Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_success', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: {
                          name: 'akroh',
                        },
                      },
                      sort: [1599064394000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'brent.murphy@elastic.co',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '16612b9216-000000060529',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'filebeat-cloud',
                          id: '47442730-d38b-4ae9-a856-9e8c28fd7b59',
                          ephemeral_id: '974af3e2-b5b4-4c28-973c-277925a4c055',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        log: {
                          'file.path':
                            'https://leh-cloudtrail-bucket.s3-us-west-2.amazonaws.com/AWSLogs/144492464627/CloudTrail/us-east-2/2020/09/03/144492464627_CloudTrail_us-east-2_20200903T1315Z_wBsSgTxregqICAhs.json.gz',
                          offset: 60529,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-MD',
                            city_name: 'Salisbury',
                            country_iso_code: 'US',
                            region_name: 'Maryland',
                            location: {
                              lon: -75.5386,
                              lat: 38.3523,
                            },
                          },
                          as: {
                            number: 7922,
                            organization: {
                              name: 'Comcast Cable Communications, LLC',
                            },
                          },
                          address: '73.172.171.53',
                          ip: '73.172.171.53',
                        },
                        fileset: {
                          name: 'cloudtrail',
                        },
                        tags: ['forwarded'],
                        cloud: {
                          provider: 'aws',
                          region: 'us-west-2',
                          account: {
                            id: '144492464627',
                          },
                        },
                        input: {
                          type: 's3',
                        },
                        '@timestamp': '2020-09-03T13:12:56.000Z',
                        ecs: {
                          version: '1.5.0',
                        },
                        service: {
                          type: 'aws',
                        },
                        aws: {
                          s3: {
                            bucket: {
                              name: 'leh-cloudtrail-bucket',
                              arn: 'arn:aws:s3:::leh-cloudtrail-bucket',
                            },
                            'object.key':
                              'AWSLogs/144492464627/CloudTrail/us-east-2/2020/09/03/144492464627_CloudTrail_us-east-2_20200903T1315Z_wBsSgTxregqICAhs.json.gz',
                          },
                          cloudtrail: {
                            event_version: '1.05',
                            flattened: {
                              additional_eventdata: {
                                LoginTo:
                                  'https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true',
                                MobileVersion: 'No',
                                MFAUsed: 'No',
                              },
                              response_elements: {
                                ConsoleLogin: 'Success',
                              },
                            },
                            event_type: 'AwsConsoleSignIn',
                            additional_eventdata:
                              '{LoginTo=https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true, MobileVersion=No, MFAUsed=No}',
                            console_login: {
                              additional_eventdata: {
                                login_to:
                                  'https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true',
                                mobile_version: false,
                                mfa_used: false,
                              },
                            },
                            user_identity: {
                              type: 'IAMUser',
                              arn: 'arn:aws:iam::144492464627:user/brent.murphy@elastic.co',
                            },
                            recipient_account_id: '144492464627',
                            response_elements: '{ConsoleLogin=Success}',
                          },
                        },
                        event: {
                          ingested: '2020-09-03T13:22:07.532900Z',
                          original:
                            '{"additionalEventData":{"LoginTo":"https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2\\u0026state=hashArgs%23\\u0026isauthcode=true","MFAUsed":"No","MobileVersion":"No"},"awsRegion":"us-east-2","eventID":"cb0910f6-7950-4b1c-8224-d3211aa3c7b1","eventName":"ConsoleLogin","eventSource":"signin.amazonaws.com","eventTime":"2020-09-03T13:12:56Z","eventType":"AwsConsoleSignIn","eventVersion":"1.05","recipientAccountId":"144492464627","requestParameters":null,"responseElements":{"ConsoleLogin":"Success"},"sourceIPAddress":"73.172.171.53","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36","userIdentity":{"accountId":"144492464627","arn":"arn:aws:iam::144492464627:user/brent.murphy@elastic.co","principalId":"AIDASDJDMBHZWH64IO6LO","type":"IAMUser","userName":"brent.murphy@elastic.co"}}',
                          provider: 'signin.amazonaws.com',
                          kind: 'event',
                          module: 'aws',
                          action: 'ConsoleLogin',
                          id: 'cb0910f6-7950-4b1c-8224-d3211aa3c7b1',
                          type: ['info'],
                          category: ['authentication'],
                          dataset: 'aws.cloudtrail',
                          outcome: 'success',
                        },
                        user: {
                          name: 'brent.murphy@elastic.co',
                          id: 'AIDASDJDMBHZWH64IO6LO',
                        },
                        user_agent: {
                          original:
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
                          os: {
                            name: 'Windows',
                            version: '10',
                            full: 'Windows 10',
                          },
                          name: 'Chrome',
                          device: {
                            name: 'Other',
                          },
                          version: '80.0.3987.163',
                        },
                      },
                      sort: [1599138776000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'lee.e.hinman@elastic.co',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'e1fc9edf48-000000000857',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'filebeat-cloud',
                          id: '47442730-d38b-4ae9-a856-9e8c28fd7b59',
                          type: 'filebeat',
                          ephemeral_id: '974af3e2-b5b4-4c28-973c-277925a4c055',
                          version: '8.0.0',
                        },
                        log: {
                          'file.path':
                            'https://leh-cloudtrail-bucket.s3-us-west-2.amazonaws.com/AWSLogs/144492464627/CloudTrail/us-east-1/2020/09/02/144492464627_CloudTrail_us-east-1_20200902T1830Z_3S6gZBorqYiwpfJS.json.gz',
                          offset: 857,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-MN',
                            city_name: 'Minneapolis',
                            country_iso_code: 'US',
                            region_name: 'Minnesota',
                            location: {
                              lon: -93.2548,
                              lat: 44.9399,
                            },
                          },
                          as: {
                            number: 10242,
                            organization: {
                              name: 'US Internet Corp',
                            },
                          },
                          address: '207.153.14.98',
                          ip: '207.153.14.98',
                        },
                        fileset: {
                          name: 'cloudtrail',
                        },
                        tags: ['forwarded'],
                        cloud: {
                          provider: 'aws',
                          region: 'us-west-2',
                          account: {
                            id: '144492464627',
                          },
                        },
                        input: {
                          type: 's3',
                        },
                        '@timestamp': '2020-09-02T18:25:07.000Z',
                        ecs: {
                          version: '1.5.0',
                        },
                        service: {
                          type: 'aws',
                        },
                        aws: {
                          s3: {
                            bucket: {
                              name: 'leh-cloudtrail-bucket',
                              arn: 'arn:aws:s3:::leh-cloudtrail-bucket',
                            },
                            'object.key':
                              'AWSLogs/144492464627/CloudTrail/us-east-1/2020/09/02/144492464627_CloudTrail_us-east-1_20200902T1830Z_3S6gZBorqYiwpfJS.json.gz',
                          },
                          cloudtrail: {
                            event_version: '1.05',
                            flattened: {
                              additional_eventdata: {
                                LoginTo:
                                  'https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true',
                                MobileVersion: 'No',
                                MFAUsed: 'Yes',
                              },
                              response_elements: {
                                ConsoleLogin: 'Success',
                              },
                            },
                            event_type: 'AwsConsoleSignIn',
                            additional_eventdata:
                              '{LoginTo=https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true, MobileVersion=No, MFAUsed=Yes}',
                            console_login: {
                              additional_eventdata: {
                                login_to:
                                  'https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true',
                                mobile_version: false,
                                mfa_used: true,
                              },
                            },
                            user_identity: {
                              type: 'IAMUser',
                              arn: 'arn:aws:iam::144492464627:user/lee.e.hinman@elastic.co',
                            },
                            recipient_account_id: '144492464627',
                            response_elements: '{ConsoleLogin=Success}',
                          },
                        },
                        event: {
                          ingested: '2020-09-02T18:35:30.476981Z',
                          original:
                            '{"additionalEventData":{"LoginTo":"https://console.aws.amazon.com/console/home?state=hashArgs%23\\u0026isauthcode=true","MFAUsed":"Yes","MobileVersion":"No"},"awsRegion":"us-east-1","eventID":"517780b0-8047-43c6-be14-b0da5dcd6ae1","eventName":"ConsoleLogin","eventSource":"signin.amazonaws.com","eventTime":"2020-09-02T18:25:07Z","eventType":"AwsConsoleSignIn","eventVersion":"1.05","recipientAccountId":"144492464627","requestParameters":null,"responseElements":{"ConsoleLogin":"Success"},"sourceIPAddress":"207.153.14.98","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36","userIdentity":{"accountId":"144492464627","arn":"arn:aws:iam::144492464627:user/lee.e.hinman@elastic.co","principalId":"AIDASDJDMBHZ5ICCQGUYI","type":"IAMUser","userName":"lee.e.hinman@elastic.co"}}',
                          provider: 'signin.amazonaws.com',
                          kind: 'event',
                          module: 'aws',
                          action: 'ConsoleLogin',
                          id: '517780b0-8047-43c6-be14-b0da5dcd6ae1',
                          type: ['info'],
                          category: ['authentication'],
                          dataset: 'aws.cloudtrail',
                          outcome: 'success',
                        },
                        user: {
                          name: 'lee.e.hinman@elastic.co',
                          id: 'AIDASDJDMBHZ5ICCQGUYI',
                        },
                        user_agent: {
                          original:
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
                          os: {
                            name: 'Mac OS X',
                            version: '10.14.6',
                            full: 'Mac OS X 10.14.6',
                          },
                          name: 'Chrome',
                          device: {
                            name: 'Mac',
                          },
                          version: '85.0.4183.83',
                        },
                      },
                      sort: [1599071107000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'user',
            doc_count: 8,
            failures: {
              doc_count: 8,
              lastFailure: {
                hits: {
                  total: 8,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'lK55VHQBB-gskclyhG0z',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17015,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 863777,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:57:54.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['user'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:58:03.953705Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'user',
                        },
                      },
                      sort: [1599145074000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'oracle',
            doc_count: 7,
            failures: {
              doc_count: 7,
              lastFailure: {
                hits: {
                  total: 7,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '5Jt1VHQBA6bGZw2u_mVb',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 16987,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 859363,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:54:07.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['oracle'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:54:13.080794Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'oracle',
                        },
                      },
                      sort: [1599144847000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 7,
            failures: {
              doc_count: 7,
              lastFailure: {
                hits: {
                  total: 7,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'upt7VHQBA6bGZw2upIaI',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17034,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 866715,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T15:00:22.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['ubuntu'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T15:00:23.302243Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'ubuntu',
                        },
                      },
                      sort: [1599145222000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'guest',
            doc_count: 6,
            failures: {
              doc_count: 6,
              lastFailure: {
                hits: {
                  total: 6,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'k655VHQBB-gskcly-XCm',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17020,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 864510,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:58:31.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['guest'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:58:34.020894Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'guest',
                        },
                      },
                      sort: [1599145111000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'odoo',
            doc_count: 6,
            failures: {
              doc_count: 6,
              lastFailure: {
                hits: {
                  total: 6,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '3a58VHQBB-gskclyo4Ua',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17041,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 867792,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T15:01:18.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['odoo'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T15:01:28.472843Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'odoo',
                        },
                      },
                      sort: [1599145278000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
        ],
      },
      user_count: {
        value: 109,
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
    took: 14,
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
      group_by_users: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 232,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 322,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              meta: {},
              doc_count: 4,
              lastSuccess: {
                hits: {
                  total: 4,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                      _id: 'DvFDVHQBc39KFIJbC_P4',
                      _score: null,
                      _source: {
                        process: {
                          name: 'services.exe',
                          pid: 564,
                          executable: 'C:\\Windows\\System32\\services.exe',
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
                            pid: 576,
                            thread: {
                              id: 2372,
                            },
                          },
                          keywords: ['Audit Success'],
                          logon: {
                            id: '0x3e7',
                            type: 'Service',
                          },
                          channel: 'Security',
                          event_data: {
                            LogonGuid: '{00000000-0000-0000-0000-000000000000}',
                            TargetOutboundDomainName: '-',
                            VirtualAccount: '%%1843',
                            LogonType: '5',
                            IpPort: '-',
                            TransmittedServices: '-',
                            SubjectLogonId: '0x3e7',
                            LmPackageName: '-',
                            TargetOutboundUserName: '-',
                            KeyLength: '0',
                            TargetLogonId: '0x3e7',
                            RestrictedAdminMode: '-',
                            TargetLinkedLogonId: '0x0',
                            SubjectUserName: 'SIEM-WINDOWS$',
                            ElevatedToken: '%%1842',
                            SubjectDomainName: 'WORKGROUP',
                            IpAddress: '-',
                            TargetUserName: 'SYSTEM',
                            ImpersonationLevel: '%%1833',
                            LogonProcessName: 'Advapi  ',
                            TargetDomainName: 'NT AUTHORITY',
                            SubjectUserSid: 'S-1-5-18',
                            AuthenticationPackageName: 'Negotiate',
                            TargetUserSid: 'S-1-5-18',
                          },
                          opcode: 'Info',
                          version: 2,
                          record_id: 57778,
                          task: 'Logon',
                          event_id: 4624,
                          provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
                          activity_id: '{d2485217-6bac-0000-8fbb-3f7e2571d601}',
                          api: 'wineventlog',
                          provider_name: 'Microsoft-Windows-Security-Auditing',
                        },
                        log: {
                          level: 'information',
                        },
                        source: {
                          domain: '-',
                        },
                        message:
                          'An account was successfully logged on.\n\nSubject:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSIEM-WINDOWS$\n\tAccount Domain:\t\tWORKGROUP\n\tLogon ID:\t\t0x3E7\n\nLogon Information:\n\tLogon Type:\t\t5\n\tRestricted Admin Mode:\t-\n\tVirtual Account:\t\tNo\n\tElevated Token:\t\tYes\n\nImpersonation Level:\t\tImpersonation\n\nNew Logon:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSYSTEM\n\tAccount Domain:\t\tNT AUTHORITY\n\tLogon ID:\t\t0x3E7\n\tLinked Logon ID:\t\t0x0\n\tNetwork Account Name:\t-\n\tNetwork Account Domain:\t-\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\n\nProcess Information:\n\tProcess ID:\t\t0x234\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t-\n\tSource Port:\t\t-\n\nDetailed Authentication Information:\n\tLogon Process:\t\tAdvapi  \n\tAuthentication Package:\tNegotiate\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\n\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\n\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\n\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe impersonation level field indicates the extent to which a process in the logon session can impersonate.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
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
                        '@timestamp': '2020-09-03T13:58:31.888Z',
                        related: {
                          user: ['SYSTEM', 'SIEM-WINDOWS$'],
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
                          code: 4624,
                          provider: 'Microsoft-Windows-Security-Auditing',
                          created: '2020-09-03T13:58:33.229Z',
                          kind: 'event',
                          module: 'security',
                          action: 'logged-in',
                          category: 'authentication',
                          type: 'start',
                          outcome: 'success',
                        },
                        user: {
                          domain: 'NT AUTHORITY',
                          name: 'SYSTEM',
                          id: 'S-1-5-18',
                        },
                      },
                      sort: [1599141511888],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'zeus',
            doc_count: 3,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 3,
              lastSuccess: {
                hits: {
                  total: 3,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '6pGDUHQBA6bGZw2ugbZe',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          name: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          id: '6efda877-cb4d-45b5-84b5-d56934d5e352',
                          ephemeral_id: '256fa22a-a0dd-4269-9d84-1c70ad27ecb8',
                          type: 'filebeat',
                          version: '7.9.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 30023,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 18175,
                        },
                        source: {
                          port: 53766,
                          ip: '10.0.7.195',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-02T16:30:20.000-04:00',
                        system: {
                          auth: {
                            ssh: {
                              method: 'password',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['10.0.7.195'],
                          user: ['zeus'],
                        },
                        data_stream: {
                          namespace: 'default',
                          type: 'logs',
                          dataset: 'system.auth',
                        },
                        host: {
                          hostname: 'mainqa-atlcolo-10-0-7-158',
                          os: {
                            kernel: '4.15.0-38-generic',
                            codename: 'bionic',
                            name: 'Ubuntu',
                            family: 'debian',
                            version: '18.04.1 LTS (Bionic Beaver)',
                            platform: 'ubuntu',
                          },
                          containerized: false,
                          ip: [
                            '10.0.7.158',
                            'fdbb:cb5c:fb4:68:250:56ff:feb1:371f',
                            'fe80::250:56ff:feb1:371f',
                          ],
                          name: 'mainqa-atlcolo-10-0-7-158.eng.endgames.local',
                          id: '739e447fc6963034621b714c584eccc1',
                          mac: ['00:50:56:b1:37:1f'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '-04:00',
                          kind: 'event',
                          action: 'ssh_login',
                          type: ['authentication_success', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: {
                          name: 'zeus',
                        },
                      },
                      sort: [1599078620000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'akroh',
            doc_count: 2,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 2,
              lastSuccess: {
                hits: {
                  total: 2,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '2Y6qT3QBA6bGZw2uWR5d',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'kibana00.siem.estc.dev',
                          id: '3420c5de-8bc6-4f04-a6d7-4e38cb0308d2',
                          type: 'filebeat',
                          ephemeral_id: 'af6bf0d3-edc3-44fb-8e1d-efbb6d1573d2',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 15119,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 71181,
                        },
                        source: {
                          port: 43576,
                          ip: '10.200.0.14',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-02T16:33:14.000Z',
                        system: {
                          auth: {
                            ssh: {
                              method: 'publickey',
                              signature: 'RSA SHA256:5+CmAa8Igw+d5Ho0myKKBP2XCQWGJMxrIZGzE38li0Y',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['10.200.0.14'],
                          user: ['akroh'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'kibana00',
                          name: 'kibana00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-02T16:33:18.169833Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_success', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: {
                          name: 'akroh',
                        },
                      },
                      sort: [1599064394000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'brent.murphy@elastic.co',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '16612b9216-000000060529',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'filebeat-cloud',
                          id: '47442730-d38b-4ae9-a856-9e8c28fd7b59',
                          ephemeral_id: '974af3e2-b5b4-4c28-973c-277925a4c055',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        log: {
                          'file.path':
                            'https://leh-cloudtrail-bucket.s3-us-west-2.amazonaws.com/AWSLogs/144492464627/CloudTrail/us-east-2/2020/09/03/144492464627_CloudTrail_us-east-2_20200903T1315Z_wBsSgTxregqICAhs.json.gz',
                          offset: 60529,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-MD',
                            city_name: 'Salisbury',
                            country_iso_code: 'US',
                            region_name: 'Maryland',
                            location: {
                              lon: -75.5386,
                              lat: 38.3523,
                            },
                          },
                          as: {
                            number: 7922,
                            organization: {
                              name: 'Comcast Cable Communications, LLC',
                            },
                          },
                          address: '73.172.171.53',
                          ip: '73.172.171.53',
                        },
                        fileset: {
                          name: 'cloudtrail',
                        },
                        tags: ['forwarded'],
                        cloud: {
                          provider: 'aws',
                          region: 'us-west-2',
                          account: {
                            id: '144492464627',
                          },
                        },
                        input: {
                          type: 's3',
                        },
                        '@timestamp': '2020-09-03T13:12:56.000Z',
                        ecs: {
                          version: '1.5.0',
                        },
                        service: {
                          type: 'aws',
                        },
                        aws: {
                          s3: {
                            bucket: {
                              name: 'leh-cloudtrail-bucket',
                              arn: 'arn:aws:s3:::leh-cloudtrail-bucket',
                            },
                            'object.key':
                              'AWSLogs/144492464627/CloudTrail/us-east-2/2020/09/03/144492464627_CloudTrail_us-east-2_20200903T1315Z_wBsSgTxregqICAhs.json.gz',
                          },
                          cloudtrail: {
                            event_version: '1.05',
                            flattened: {
                              additional_eventdata: {
                                LoginTo:
                                  'https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true',
                                MobileVersion: 'No',
                                MFAUsed: 'No',
                              },
                              response_elements: {
                                ConsoleLogin: 'Success',
                              },
                            },
                            event_type: 'AwsConsoleSignIn',
                            additional_eventdata:
                              '{LoginTo=https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true, MobileVersion=No, MFAUsed=No}',
                            console_login: {
                              additional_eventdata: {
                                login_to:
                                  'https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2&state=hashArgs%23&isauthcode=true',
                                mobile_version: false,
                                mfa_used: false,
                              },
                            },
                            user_identity: {
                              type: 'IAMUser',
                              arn: 'arn:aws:iam::144492464627:user/brent.murphy@elastic.co',
                            },
                            recipient_account_id: '144492464627',
                            response_elements: '{ConsoleLogin=Success}',
                          },
                        },
                        event: {
                          ingested: '2020-09-03T13:22:07.532900Z',
                          original:
                            '{"additionalEventData":{"LoginTo":"https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2\\u0026state=hashArgs%23\\u0026isauthcode=true","MFAUsed":"No","MobileVersion":"No"},"awsRegion":"us-east-2","eventID":"cb0910f6-7950-4b1c-8224-d3211aa3c7b1","eventName":"ConsoleLogin","eventSource":"signin.amazonaws.com","eventTime":"2020-09-03T13:12:56Z","eventType":"AwsConsoleSignIn","eventVersion":"1.05","recipientAccountId":"144492464627","requestParameters":null,"responseElements":{"ConsoleLogin":"Success"},"sourceIPAddress":"73.172.171.53","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36","userIdentity":{"accountId":"144492464627","arn":"arn:aws:iam::144492464627:user/brent.murphy@elastic.co","principalId":"AIDASDJDMBHZWH64IO6LO","type":"IAMUser","userName":"brent.murphy@elastic.co"}}',
                          provider: 'signin.amazonaws.com',
                          kind: 'event',
                          module: 'aws',
                          action: 'ConsoleLogin',
                          id: 'cb0910f6-7950-4b1c-8224-d3211aa3c7b1',
                          type: ['info'],
                          category: ['authentication'],
                          dataset: 'aws.cloudtrail',
                          outcome: 'success',
                        },
                        user: {
                          name: 'brent.murphy@elastic.co',
                          id: 'AIDASDJDMBHZWH64IO6LO',
                        },
                        user_agent: {
                          original:
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
                          os: {
                            name: 'Windows',
                            version: '10',
                            full: 'Windows 10',
                          },
                          name: 'Chrome',
                          device: {
                            name: 'Other',
                          },
                          version: '80.0.3987.163',
                        },
                      },
                      sort: [1599138776000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'lee.e.hinman@elastic.co',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'e1fc9edf48-000000000857',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'filebeat-cloud',
                          id: '47442730-d38b-4ae9-a856-9e8c28fd7b59',
                          type: 'filebeat',
                          ephemeral_id: '974af3e2-b5b4-4c28-973c-277925a4c055',
                          version: '8.0.0',
                        },
                        log: {
                          'file.path':
                            'https://leh-cloudtrail-bucket.s3-us-west-2.amazonaws.com/AWSLogs/144492464627/CloudTrail/us-east-1/2020/09/02/144492464627_CloudTrail_us-east-1_20200902T1830Z_3S6gZBorqYiwpfJS.json.gz',
                          offset: 857,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-MN',
                            city_name: 'Minneapolis',
                            country_iso_code: 'US',
                            region_name: 'Minnesota',
                            location: {
                              lon: -93.2548,
                              lat: 44.9399,
                            },
                          },
                          as: {
                            number: 10242,
                            organization: {
                              name: 'US Internet Corp',
                            },
                          },
                          address: '207.153.14.98',
                          ip: '207.153.14.98',
                        },
                        fileset: {
                          name: 'cloudtrail',
                        },
                        tags: ['forwarded'],
                        cloud: {
                          provider: 'aws',
                          region: 'us-west-2',
                          account: {
                            id: '144492464627',
                          },
                        },
                        input: {
                          type: 's3',
                        },
                        '@timestamp': '2020-09-02T18:25:07.000Z',
                        ecs: {
                          version: '1.5.0',
                        },
                        service: {
                          type: 'aws',
                        },
                        aws: {
                          s3: {
                            bucket: {
                              name: 'leh-cloudtrail-bucket',
                              arn: 'arn:aws:s3:::leh-cloudtrail-bucket',
                            },
                            'object.key':
                              'AWSLogs/144492464627/CloudTrail/us-east-1/2020/09/02/144492464627_CloudTrail_us-east-1_20200902T1830Z_3S6gZBorqYiwpfJS.json.gz',
                          },
                          cloudtrail: {
                            event_version: '1.05',
                            flattened: {
                              additional_eventdata: {
                                LoginTo:
                                  'https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true',
                                MobileVersion: 'No',
                                MFAUsed: 'Yes',
                              },
                              response_elements: {
                                ConsoleLogin: 'Success',
                              },
                            },
                            event_type: 'AwsConsoleSignIn',
                            additional_eventdata:
                              '{LoginTo=https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true, MobileVersion=No, MFAUsed=Yes}',
                            console_login: {
                              additional_eventdata: {
                                login_to:
                                  'https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true',
                                mobile_version: false,
                                mfa_used: true,
                              },
                            },
                            user_identity: {
                              type: 'IAMUser',
                              arn: 'arn:aws:iam::144492464627:user/lee.e.hinman@elastic.co',
                            },
                            recipient_account_id: '144492464627',
                            response_elements: '{ConsoleLogin=Success}',
                          },
                        },
                        event: {
                          ingested: '2020-09-02T18:35:30.476981Z',
                          original:
                            '{"additionalEventData":{"LoginTo":"https://console.aws.amazon.com/console/home?state=hashArgs%23\\u0026isauthcode=true","MFAUsed":"Yes","MobileVersion":"No"},"awsRegion":"us-east-1","eventID":"517780b0-8047-43c6-be14-b0da5dcd6ae1","eventName":"ConsoleLogin","eventSource":"signin.amazonaws.com","eventTime":"2020-09-02T18:25:07Z","eventType":"AwsConsoleSignIn","eventVersion":"1.05","recipientAccountId":"144492464627","requestParameters":null,"responseElements":{"ConsoleLogin":"Success"},"sourceIPAddress":"207.153.14.98","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36","userIdentity":{"accountId":"144492464627","arn":"arn:aws:iam::144492464627:user/lee.e.hinman@elastic.co","principalId":"AIDASDJDMBHZ5ICCQGUYI","type":"IAMUser","userName":"lee.e.hinman@elastic.co"}}',
                          provider: 'signin.amazonaws.com',
                          kind: 'event',
                          module: 'aws',
                          action: 'ConsoleLogin',
                          id: '517780b0-8047-43c6-be14-b0da5dcd6ae1',
                          type: ['info'],
                          category: ['authentication'],
                          dataset: 'aws.cloudtrail',
                          outcome: 'success',
                        },
                        user: {
                          name: 'lee.e.hinman@elastic.co',
                          id: 'AIDASDJDMBHZ5ICCQGUYI',
                        },
                        user_agent: {
                          original:
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
                          os: {
                            name: 'Mac OS X',
                            version: '10.14.6',
                            full: 'Mac OS X 10.14.6',
                          },
                          name: 'Chrome',
                          device: {
                            name: 'Mac',
                          },
                          version: '85.0.4183.83',
                        },
                      },
                      sort: [1599071107000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'user',
            doc_count: 8,
            failures: {
              doc_count: 8,
              lastFailure: {
                hits: {
                  total: 8,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'lK55VHQBB-gskclyhG0z',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17015,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 863777,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:57:54.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['user'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:58:03.953705Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'user',
                        },
                      },
                      sort: [1599145074000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'oracle',
            doc_count: 7,
            failures: {
              doc_count: 7,
              lastFailure: {
                hits: {
                  total: 7,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '5Jt1VHQBA6bGZw2u_mVb',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 16987,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 859363,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:54:07.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['oracle'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:54:13.080794Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'oracle',
                        },
                      },
                      sort: [1599144847000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 7,
            failures: {
              doc_count: 7,
              lastFailure: {
                hits: {
                  total: 7,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'upt7VHQBA6bGZw2upIaI',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17034,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 866715,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T15:00:22.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['ubuntu'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T15:00:23.302243Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'ubuntu',
                        },
                      },
                      sort: [1599145222000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'guest',
            doc_count: 6,
            failures: {
              doc_count: 6,
              lastFailure: {
                hits: {
                  total: 6,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'k655VHQBB-gskcly-XCm',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17020,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 864510,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T14:58:31.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['guest'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T14:58:34.020894Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'guest',
                        },
                      },
                      sort: [1599145111000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
          {
            key: 'odoo',
            doc_count: 6,
            failures: {
              doc_count: 6,
              lastFailure: {
                hits: {
                  total: 6,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: '3a58VHQBB-gskclyo4Ua',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: {
                          name: 'sshd',
                          pid: 17041,
                        },
                        log: {
                          file: {
                            path: '/var/log/auth.log',
                          },
                          offset: 867792,
                        },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: {
                              lon: -97.822,
                              lat: 37.751,
                            },
                          },
                          as: {
                            number: 133766,
                            organization: {
                              name: 'YHSRV.LLC',
                            },
                          },
                          ip: '193.228.91.109',
                        },
                        fileset: {
                          name: 'auth',
                        },
                        input: {
                          type: 'log',
                        },
                        '@timestamp': '2020-09-03T15:01:18.000Z',
                        system: {
                          auth: {
                            ssh: {
                              event: 'Invalid',
                            },
                          },
                        },
                        ecs: {
                          version: '1.5.0',
                        },
                        related: {
                          ip: ['193.228.91.109'],
                          user: ['odoo'],
                        },
                        service: {
                          type: 'system',
                        },
                        host: {
                          hostname: 'bastion00',
                          name: 'bastion00.siem.estc.dev',
                        },
                        event: {
                          ingested: '2020-09-03T15:01:28.472843Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: {
                          name: 'odoo',
                        },
                      },
                      sort: [1599145278000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: {
                hits: {
                  total: 0,
                  max_score: 0,
                  hits: [],
                },
              },
            },
          },
        ],
      },
      user_count: {
        value: 109,
      },
    },
  },
  total: 21,
  loaded: 21,
  inspect: {
    dsl: [
      '{\n  "allowNoIndices": true,\n  "index": [\n    "apm-*-transaction*",\n    "auditbeat-*",\n    "endgame-*",\n    "filebeat-*",\n    "logs-*",\n    "packetbeat-*",\n    "winlogbeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "user_count": {\n        "cardinality": {\n          "field": "user.name"\n        }\n      },\n      "group_by_users": {\n        "terms": {\n          "size": 10,\n          "field": "user.name",\n          "order": [\n            {\n              "successes.doc_count": "desc"\n            },\n            {\n              "failures.doc_count": "desc"\n            }\n          ]\n        },\n        "aggs": {\n          "failures": {\n            "filter": {\n              "term": {\n                "event.outcome": "failure"\n              }\n            },\n            "aggs": {\n              "lastFailure": {\n                "top_hits": {\n                  "size": 1,\n                  "_source": [],\n                  "sort": [\n                    {\n                      "@timestamp": {\n                        "order": "desc"\n                      }\n                    }\n                  ]\n                }\n              }\n            }\n          },\n          "successes": {\n            "filter": {\n              "term": {\n                "event.outcome": "success"\n              }\n            },\n            "aggs": {\n              "lastSuccess": {\n                "top_hits": {\n                  "size": 1,\n                  "_source": [],\n                  "sort": [\n                    {\n                      "@timestamp": {\n                        "order": "desc"\n                      }\n                    }\n                  ]\n                }\n              }\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          "{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"match_all\\":{}}],\\"should\\":[],\\"must_not\\":[]}}",\n          {\n            "term": {\n              "event.category": "authentication"\n            }\n          },\n          {\n            "range": {\n              "@timestamp": {\n                "gte": "2020-09-02T15:17:13.678Z",\n                "lte": "2020-09-03T15:17:13.678Z",\n                "format": "strict_date_optional_time"\n              }\n            }\n          }\n        ]\n      }\n    },\n    "size": 0\n  },\n  "track_total_hits": false\n}',
    ],
  },
  edges: [
    {
      node: {
        failures: 0,
        successes: 4,
        _id: 'SYSTEM+322',
        user: {
          name: ['SYSTEM'],
        },
        lastSuccess: {
          timestamp: ['2020-09-03T13:58:31.888Z'],
          source: {
            ip: [],
          },
          host: {
            id: ['ce1d3c9b-a815-4643-9641-ada0f2c00609'],
            name: ['siem-windows'],
          },
        },
        lastFailure: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 0,
        successes: 3,
        _id: 'zeus+3',
        user: {
          name: ['zeus'],
        },
        lastSuccess: {
          timestamp: ['2020-09-02T16:30:20.000-04:00'],
          source: {
            ip: ['10.0.7.195'],
          },
          host: {
            id: ['739e447fc6963034621b714c584eccc1'],
            name: ['mainqa-atlcolo-10-0-7-158.eng.endgames.local'],
          },
        },
        lastFailure: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 0,
        successes: 2,
        _id: 'akroh+2',
        user: {
          name: ['akroh'],
        },
        lastSuccess: {
          timestamp: ['2020-09-02T16:33:14.000Z'],
          source: {
            ip: ['10.200.0.14'],
          },
          host: {
            id: [],
            name: ['kibana00.siem.estc.dev'],
          },
        },
        lastFailure: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 0,
        successes: 1,
        _id: 'brent.murphy@elastic.co+1',
        user: {
          name: ['brent.murphy@elastic.co'],
        },
        lastSuccess: {
          timestamp: ['2020-09-03T13:12:56.000Z'],
          source: {
            ip: ['73.172.171.53'],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 0,
        successes: 1,
        _id: 'lee.e.hinman@elastic.co+1',
        user: {
          name: ['lee.e.hinman@elastic.co'],
        },
        lastSuccess: {
          timestamp: ['2020-09-02T18:25:07.000Z'],
          source: {
            ip: ['207.153.14.98'],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 8,
        successes: 0,
        _id: 'user+8',
        user: {
          name: ['user'],
        },
        lastSuccess: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: ['2020-09-03T14:57:54.000Z'],
          source: {
            ip: ['193.228.91.109'],
          },
          host: {
            id: [],
            name: ['bastion00.siem.estc.dev'],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 7,
        successes: 0,
        _id: 'oracle+7',
        user: {
          name: ['oracle'],
        },
        lastSuccess: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: ['2020-09-03T14:54:07.000Z'],
          source: {
            ip: ['193.228.91.109'],
          },
          host: {
            id: [],
            name: ['bastion00.siem.estc.dev'],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 7,
        successes: 0,
        _id: 'ubuntu+7',
        user: {
          name: ['ubuntu'],
        },
        lastSuccess: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: ['2020-09-03T15:00:22.000Z'],
          source: {
            ip: ['193.228.91.109'],
          },
          host: {
            id: [],
            name: ['bastion00.siem.estc.dev'],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 6,
        successes: 0,
        _id: 'guest+6',
        user: {
          name: ['guest'],
        },
        lastSuccess: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: ['2020-09-03T14:58:31.000Z'],
          source: {
            ip: ['193.228.91.109'],
          },
          host: {
            id: [],
            name: ['bastion00.siem.estc.dev'],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        failures: 6,
        successes: 0,
        _id: 'odoo+6',
        user: {
          name: ['odoo'],
        },
        lastSuccess: {
          timestamp: [],
          source: {
            ip: [],
          },
          host: {
            id: [],
            name: [],
          },
        },
        lastFailure: {
          timestamp: ['2020-09-03T15:01:18.000Z'],
          source: {
            ip: ['193.228.91.109'],
          },
          host: {
            id: [],
            name: ['bastion00.siem.estc.dev'],
          },
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
  ],
  totalCount: 109,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 50,
    showMorePagesIndicator: true,
  },
};

export const expectedDsl = {
  allowNoIndices: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignoreUnavailable: true,
  body: {
    aggregations: {
      user_count: { cardinality: { field: 'user.name' } },
      group_by_users: {
        terms: {
          size: 10,
          field: 'user.name',
          order: [{ 'successes.doc_count': 'desc' }, { 'failures.doc_count': 'desc' }],
        },
        aggs: {
          failures: {
            filter: { term: { 'event.outcome': 'failure' } },
            aggs: {
              lastFailure: {
                top_hits: { size: 1, _source: [], sort: [{ '@timestamp': { order: 'desc' } }] },
              },
            },
          },
          successes: {
            filter: { term: { 'event.outcome': 'success' } },
            aggs: {
              lastSuccess: {
                top_hits: { size: 1, _source: [], sort: [{ '@timestamp': { order: 'desc' } }] },
              },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
          { term: { 'event.category': 'authentication' } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-02T15:17:13.678Z',
                lte: '2020-09-03T15:17:13.678Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
  },
  track_total_hits: false,
};
