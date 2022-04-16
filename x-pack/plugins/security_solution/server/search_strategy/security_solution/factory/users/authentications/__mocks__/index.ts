/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  UserAuthenticationsRequestOptions,
  AuthenticationHit,
  Direction,
  UsersQueries,
  AuthStackByField,
} from '../../../../../../../common/search_strategy';

export const mockOptions: UserAuthenticationsRequestOptions = {
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
  stackByField: AuthStackByField.userName,
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
  factoryQueryType: UsersQueries.authentications,
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
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      stack_by: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 408,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 281,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
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
                      _id: 'zqY7WXQBA6bGZw2uLeKI',
                      _score: null,
                      _source: {
                        process: {
                          name: 'services.exe',
                          pid: 564,
                          executable: 'C:\\Windows\\System32\\services.exe',
                        },
                        agent: {
                          build_date: '2020-07-16 09:16:27 +0000 UTC ',
                          name: 'siem-windows',
                          commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                          id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                          type: 'winlogbeat',
                          ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                          version: '8.0.0',
                          user: { name: 'inside_winlogbeat_user' },
                        },
                        winlog: {
                          computer_name: 'siem-windows',
                          process: { pid: 576, thread: { id: 880 } },
                          keywords: ['Audit Success'],
                          logon: { id: '0x3e7', type: 'Service' },
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
                            SubjectUserName: 'SIEM-WINDOWS$',
                            TargetLinkedLogonId: '0x0',
                            ElevatedToken: '%%1842',
                            SubjectDomainName: 'WORKGROUP',
                            IpAddress: '-',
                            ImpersonationLevel: '%%1833',
                            TargetUserName: 'SYSTEM',
                            LogonProcessName: 'Advapi  ',
                            TargetDomainName: 'NT AUTHORITY',
                            SubjectUserSid: 'S-1-5-18',
                            TargetUserSid: 'S-1-5-18',
                            AuthenticationPackageName: 'Negotiate',
                          },
                          opcode: 'Info',
                          version: 2,
                          record_id: 57818,
                          task: 'Logon',
                          event_id: 4624,
                          provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
                          activity_id: '{d2485217-6bac-0000-8fbb-3f7e2571d601}',
                          api: 'wineventlog',
                          provider_name: 'Microsoft-Windows-Security-Auditing',
                        },
                        log: { level: 'information' },
                        source: { domain: '-' },
                        message:
                          'An account was successfully logged on.\n\nSubject:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSIEM-WINDOWS$\n\tAccount Domain:\t\tWORKGROUP\n\tLogon ID:\t\t0x3E7\n\nLogon Information:\n\tLogon Type:\t\t5\n\tRestricted Admin Mode:\t-\n\tVirtual Account:\t\tNo\n\tElevated Token:\t\tYes\n\nImpersonation Level:\t\tImpersonation\n\nNew Logon:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSYSTEM\n\tAccount Domain:\t\tNT AUTHORITY\n\tLogon ID:\t\t0x3E7\n\tLinked Logon ID:\t\t0x0\n\tNetwork Account Name:\t-\n\tNetwork Account Domain:\t-\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\n\nProcess Information:\n\tProcess ID:\t\t0x234\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t-\n\tSource Port:\t\t-\n\nDetailed Authentication Information:\n\tLogon Process:\t\tAdvapi  \n\tAuthentication Package:\tNegotiate\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\n\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\n\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\n\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe impersonation level field indicates the extent to which a process in the logon session can impersonate.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
                        cloud: {
                          availability_zone: 'us-central1-c',
                          instance: { name: 'siem-windows', id: '9156726559029788564' },
                          provider: 'gcp',
                          machine: { type: 'g1-small' },
                          project: { id: 'elastic-siem' },
                        },
                        '@timestamp': '2020-09-04T13:08:02.532Z',
                        related: { user: ['SYSTEM', 'SIEM-WINDOWS$'] },
                        ecs: { version: '1.5.0' },
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
                          created: '2020-09-04T13:08:03.638Z',
                          kind: 'event',
                          module: 'security',
                          action: 'logged-in',
                          category: 'authentication',
                          type: 'start',
                          outcome: 'success',
                        },
                        user: { domain: 'NT AUTHORITY', name: 'SYSTEM', id: 'S-1-5-18' },
                      },
                      sort: [1599224882532],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'tsg',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '9_sfWXQBc39KFIJbIsDh',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 20764 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 552463 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            region_iso_code: 'DE-BE',
                            city_name: 'Berlin',
                            country_iso_code: 'DE',
                            region_name: 'Land Berlin',
                            location: { lon: 13.3512, lat: 52.5727 },
                          },
                          as: { number: 6805, organization: { name: 'Telefonica Germany' } },
                          port: 57457,
                          ip: '77.183.42.188',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:49:21.000Z',
                        system: {
                          auth: {
                            ssh: {
                              method: 'publickey',
                              signature: 'RSA SHA256:vv64JNLzKZWYA9vonnGWuW7zxWhyZrL/BFxyIGbISx8',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_success',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: { name: 'tsg' },
                      },
                      sort: [1599220161000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'admin',
            doc_count: 23,
            failures: {
              doc_count: 23,
              lastFailure: {
                hits: {
                  total: 23,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'ZfxZWXQBc39KFIJbLN5U',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 22913 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 562910 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'KR-28',
                            city_name: 'Incheon',
                            country_iso_code: 'KR',
                            region_name: 'Incheon',
                            location: { lon: 126.7288, lat: 37.4562 },
                          },
                          as: { number: 4766, organization: { name: 'Korea Telecom' } },
                          ip: '59.15.3.197',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:40:46.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'admin' },
                      },
                      sort: [1599226846000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'user',
            doc_count: 21,
            failures: {
              doc_count: 21,
              lastFailure: {
                hits: {
                  total: 21,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'M_xLWXQBc39KFIJbY7Cb',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20671 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1028103 },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-NY',
                            city_name: 'New York',
                            country_iso_code: 'US',
                            region_name: 'New York',
                            location: { lon: -74, lat: 40.7157 },
                          },
                          ip: '64.227.88.245',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:25:43.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['64.227.88.245'], user: ['user'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T13:25:47.034172Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'user' },
                      },
                      sort: [1599225943000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 18,
            failures: {
              doc_count: 18,
              lastFailure: {
                hits: {
                  total: 18,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'nPxKWXQBc39KFIJb7q4w',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20665 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1027372 },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-NY',
                            city_name: 'New York',
                            country_iso_code: 'US',
                            region_name: 'New York',
                            location: { lon: -74, lat: 40.7157 },
                          },
                          ip: '64.227.88.245',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:25:07.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['64.227.88.245'], user: ['ubuntu'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T13:25:16.974606Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'ubuntu' },
                      },
                      sort: [1599225907000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'odoo',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'mPsfWXQBc39KFIJbI8HI',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          type: 'filebeat',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 21506 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 556761 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'IN-DL',
                            city_name: 'New Delhi',
                            country_iso_code: 'IN',
                            region_name: 'National Capital Territory of Delhi',
                            location: { lon: 77.2245, lat: 28.6358 },
                          },
                          as: { number: 10029, organization: { name: 'SHYAM SPECTRA PVT LTD' } },
                          ip: '180.151.228.166',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T12:26:36.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'odoo' },
                      },
                      sort: [1599222396000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'pi',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'aaToWHQBA6bGZw2uR-St',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20475 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1019218 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            region_iso_code: 'SE-AB',
                            city_name: 'Stockholm',
                            country_iso_code: 'SE',
                            region_name: 'Stockholm',
                            location: { lon: 17.7833, lat: 59.25 },
                          },
                          as: { number: 8473, organization: { name: 'Bahnhof AB' } },
                          ip: '178.174.148.58',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:37:22.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['178.174.148.58'], user: ['pi'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T11:37:31.797423Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'pi' },
                      },
                      sort: [1599219442000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'demo',
            doc_count: 14,
            failures: {
              doc_count: 14,
              lastFailure: {
                hits: {
                  total: 14,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'VaP_V3QBA6bGZw2upUbg',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 19849 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 981036 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            country_iso_code: 'HR',
                            location: { lon: 15.5, lat: 45.1667 },
                          },
                          as: {
                            number: 42864,
                            organization: { name: 'Giganet Internet Szolgaltato Kft' },
                          },
                          ip: '45.95.168.157',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T07:23:22.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['45.95.168.157'], user: ['demo'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T07:23:26.046346Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'demo' },
                      },
                      sort: [1599204202000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'git',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'PqYfWXQBA6bGZw2uIhVU',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 20396 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 550795 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'CN-BJ',
                            city_name: 'Beijing',
                            country_iso_code: 'CN',
                            region_name: 'Beijing',
                            location: { lon: 116.3889, lat: 39.9288 },
                          },
                          as: {
                            number: 45090,
                            organization: {
                              name: 'Shenzhen Tencent Computer Systems Company Limited',
                            },
                          },
                          ip: '123.206.30.76',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:20:26.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'git' },
                      },
                      sort: [1599218426000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'webadmin',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'iMABWHQBB-gskclyitP-',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 19870 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 984133 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            country_iso_code: 'HR',
                            location: { lon: 15.5, lat: 45.1667 },
                          },
                          as: {
                            number: 42864,
                            organization: { name: 'Giganet Internet Szolgaltato Kft' },
                          },
                          ip: '45.95.168.157',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T07:25:28.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['45.95.168.157'], user: ['webadmin'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T07:25:30.236651Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'webadmin' },
                      },
                      sort: [1599204328000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
        ],
      },
      stack_by_count: { value: 188 },
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
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      stack_by: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 408,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 281,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
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
                      _id: 'zqY7WXQBA6bGZw2uLeKI',
                      _score: null,
                      _source: {
                        process: {
                          name: 'services.exe',
                          pid: 564,
                          executable: 'C:\\Windows\\System32\\services.exe',
                        },
                        agent: {
                          build_date: '2020-07-16 09:16:27 +0000 UTC ',
                          name: 'siem-windows',
                          commit: '4dcbde39492bdc3843034bba8db811c68cb44b97 ',
                          id: '05e1bff7-d7a8-416a-8554-aa10288fa07d',
                          type: 'winlogbeat',
                          ephemeral_id: '655abd6c-6c33-435d-a2eb-79b2a01e6d61',
                          version: '8.0.0',
                          user: { name: 'inside_winlogbeat_user' },
                        },
                        winlog: {
                          computer_name: 'siem-windows',
                          process: { pid: 576, thread: { id: 880 } },
                          keywords: ['Audit Success'],
                          logon: { id: '0x3e7', type: 'Service' },
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
                            SubjectUserName: 'SIEM-WINDOWS$',
                            TargetLinkedLogonId: '0x0',
                            ElevatedToken: '%%1842',
                            SubjectDomainName: 'WORKGROUP',
                            IpAddress: '-',
                            ImpersonationLevel: '%%1833',
                            TargetUserName: 'SYSTEM',
                            LogonProcessName: 'Advapi  ',
                            TargetDomainName: 'NT AUTHORITY',
                            SubjectUserSid: 'S-1-5-18',
                            TargetUserSid: 'S-1-5-18',
                            AuthenticationPackageName: 'Negotiate',
                          },
                          opcode: 'Info',
                          version: 2,
                          record_id: 57818,
                          task: 'Logon',
                          event_id: 4624,
                          provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
                          activity_id: '{d2485217-6bac-0000-8fbb-3f7e2571d601}',
                          api: 'wineventlog',
                          provider_name: 'Microsoft-Windows-Security-Auditing',
                        },
                        log: { level: 'information' },
                        source: { domain: '-' },
                        message:
                          'An account was successfully logged on.\n\nSubject:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSIEM-WINDOWS$\n\tAccount Domain:\t\tWORKGROUP\n\tLogon ID:\t\t0x3E7\n\nLogon Information:\n\tLogon Type:\t\t5\n\tRestricted Admin Mode:\t-\n\tVirtual Account:\t\tNo\n\tElevated Token:\t\tYes\n\nImpersonation Level:\t\tImpersonation\n\nNew Logon:\n\tSecurity ID:\t\tS-1-5-18\n\tAccount Name:\t\tSYSTEM\n\tAccount Domain:\t\tNT AUTHORITY\n\tLogon ID:\t\t0x3E7\n\tLinked Logon ID:\t\t0x0\n\tNetwork Account Name:\t-\n\tNetwork Account Domain:\t-\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\n\nProcess Information:\n\tProcess ID:\t\t0x234\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t-\n\tSource Port:\t\t-\n\nDetailed Authentication Information:\n\tLogon Process:\t\tAdvapi  \n\tAuthentication Package:\tNegotiate\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\n\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\n\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\n\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe impersonation level field indicates the extent to which a process in the logon session can impersonate.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
                        cloud: {
                          availability_zone: 'us-central1-c',
                          instance: { name: 'siem-windows', id: '9156726559029788564' },
                          provider: 'gcp',
                          machine: { type: 'g1-small' },
                          project: { id: 'elastic-siem' },
                        },
                        '@timestamp': '2020-09-04T13:08:02.532Z',
                        related: { user: ['SYSTEM', 'SIEM-WINDOWS$'] },
                        ecs: { version: '1.5.0' },
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
                          created: '2020-09-04T13:08:03.638Z',
                          kind: 'event',
                          module: 'security',
                          action: 'logged-in',
                          category: 'authentication',
                          type: 'start',
                          outcome: 'success',
                        },
                        user: { domain: 'NT AUTHORITY', name: 'SYSTEM', id: 'S-1-5-18' },
                      },
                      sort: [1599224882532],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'tsg',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '9_sfWXQBc39KFIJbIsDh',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 20764 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 552463 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            region_iso_code: 'DE-BE',
                            city_name: 'Berlin',
                            country_iso_code: 'DE',
                            region_name: 'Land Berlin',
                            location: { lon: 13.3512, lat: 52.5727 },
                          },
                          as: { number: 6805, organization: { name: 'Telefonica Germany' } },
                          port: 57457,
                          ip: '77.183.42.188',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:49:21.000Z',
                        system: {
                          auth: {
                            ssh: {
                              method: 'publickey',
                              signature: 'RSA SHA256:vv64JNLzKZWYA9vonnGWuW7zxWhyZrL/BFxyIGbISx8',
                              event: 'Accepted',
                            },
                          },
                        },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_success',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'success',
                        },
                        user: { name: 'tsg' },
                      },
                      sort: [1599220161000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'admin',
            doc_count: 23,
            failures: {
              doc_count: 23,
              lastFailure: {
                hits: {
                  total: 23,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'ZfxZWXQBc39KFIJbLN5U',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 22913 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 562910 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'KR-28',
                            city_name: 'Incheon',
                            country_iso_code: 'KR',
                            region_name: 'Incheon',
                            location: { lon: 126.7288, lat: 37.4562 },
                          },
                          as: { number: 4766, organization: { name: 'Korea Telecom' } },
                          ip: '59.15.3.197',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:40:46.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'admin' },
                      },
                      sort: [1599226846000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'user',
            doc_count: 21,
            failures: {
              doc_count: 21,
              lastFailure: {
                hits: {
                  total: 21,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'M_xLWXQBc39KFIJbY7Cb',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20671 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1028103 },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-NY',
                            city_name: 'New York',
                            country_iso_code: 'US',
                            region_name: 'New York',
                            location: { lon: -74, lat: 40.7157 },
                          },
                          ip: '64.227.88.245',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:25:43.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['64.227.88.245'], user: ['user'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T13:25:47.034172Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'user' },
                      },
                      sort: [1599225943000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 18,
            failures: {
              doc_count: 18,
              lastFailure: {
                hits: {
                  total: 18,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'nPxKWXQBc39KFIJb7q4w',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          type: 'filebeat',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20665 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1027372 },
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-NY',
                            city_name: 'New York',
                            country_iso_code: 'US',
                            region_name: 'New York',
                            location: { lon: -74, lat: 40.7157 },
                          },
                          ip: '64.227.88.245',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T13:25:07.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['64.227.88.245'], user: ['ubuntu'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T13:25:16.974606Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'ubuntu' },
                      },
                      sort: [1599225907000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'odoo',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'mPsfWXQBc39KFIJbI8HI',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          type: 'filebeat',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 21506 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 556761 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'IN-DL',
                            city_name: 'New Delhi',
                            country_iso_code: 'IN',
                            region_name: 'National Capital Territory of Delhi',
                            location: { lon: 77.2245, lat: 28.6358 },
                          },
                          as: { number: 10029, organization: { name: 'SHYAM SPECTRA PVT LTD' } },
                          ip: '180.151.228.166',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T12:26:36.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'odoo' },
                      },
                      sort: [1599222396000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'pi',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'aaToWHQBA6bGZw2uR-St',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 20475 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 1019218 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            region_iso_code: 'SE-AB',
                            city_name: 'Stockholm',
                            country_iso_code: 'SE',
                            region_name: 'Stockholm',
                            location: { lon: 17.7833, lat: 59.25 },
                          },
                          as: { number: 8473, organization: { name: 'Bahnhof AB' } },
                          ip: '178.174.148.58',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:37:22.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['178.174.148.58'], user: ['pi'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T11:37:31.797423Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'pi' },
                      },
                      sort: [1599219442000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'demo',
            doc_count: 14,
            failures: {
              doc_count: 14,
              lastFailure: {
                hits: {
                  total: 14,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'VaP_V3QBA6bGZw2upUbg',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 19849 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 981036 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            country_iso_code: 'HR',
                            location: { lon: 15.5, lat: 45.1667 },
                          },
                          as: {
                            number: 42864,
                            organization: { name: 'Giganet Internet Szolgaltato Kft' },
                          },
                          ip: '45.95.168.157',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T07:23:22.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['45.95.168.157'], user: ['demo'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T07:23:26.046346Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'demo' },
                      },
                      sort: [1599204202000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'git',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'PqYfWXQBA6bGZw2uIhVU',
                      _score: null,
                      _source: {
                        agent: {
                          hostname: 'siem-kibana',
                          name: 'siem-kibana',
                          id: 'aa3d9dc7-fef1-4c2f-a68d-25785d624e35',
                          ephemeral_id: 'e503bd85-11c7-4bc9-ae7d-70be1d919fb7',
                          type: 'filebeat',
                          version: '7.9.1',
                        },
                        process: { name: 'sshd', pid: 20396 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 550795 },
                        source: {
                          geo: {
                            continent_name: 'Asia',
                            region_iso_code: 'CN-BJ',
                            city_name: 'Beijing',
                            country_iso_code: 'CN',
                            region_name: 'Beijing',
                            location: { lon: 116.3889, lat: 39.9288 },
                          },
                          as: {
                            number: 45090,
                            organization: {
                              name: 'Shenzhen Tencent Computer Systems Company Limited',
                            },
                          },
                          ip: '123.206.30.76',
                        },
                        cloud: {
                          availability_zone: 'us-east1-b',
                          instance: { name: 'siem-kibana', id: '5412578377715150143' },
                          provider: 'gcp',
                          machine: { type: 'n1-standard-2' },
                          project: { id: 'elastic-beats' },
                        },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T11:20:26.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        data_stream: { namespace: 'default', type: 'logs', dataset: 'system.auth' },
                        host: {
                          hostname: 'siem-kibana',
                          os: {
                            kernel: '4.9.0-8-amd64',
                            codename: 'stretch',
                            name: 'Debian GNU/Linux',
                            family: 'debian',
                            version: '9 (stretch)',
                            platform: 'debian',
                          },
                          containerized: false,
                          ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                          name: 'siem-kibana',
                          id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
                          mac: ['42:01:0a:8e:00:07'],
                          architecture: 'x86_64',
                        },
                        event: {
                          timezone: '+00:00',
                          action: 'ssh_login',
                          type: 'authentication_failure',
                          category: 'authentication',
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'git' },
                      },
                      sort: [1599218426000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'webadmin',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'iMABWHQBB-gskclyitP-',
                      _score: null,
                      _source: {
                        agent: {
                          name: 'bastion00.siem.estc.dev',
                          id: 'f9a321c1-ec27-49fa-aacf-6a50ef6d836f',
                          type: 'filebeat',
                          ephemeral_id: '734ee3da-1a4f-4bc9-b400-e0cf0e5eeebc',
                          version: '8.0.0',
                        },
                        process: { name: 'sshd', pid: 19870 },
                        log: { file: { path: '/var/log/auth.log' }, offset: 984133 },
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            country_iso_code: 'HR',
                            location: { lon: 15.5, lat: 45.1667 },
                          },
                          as: {
                            number: 42864,
                            organization: { name: 'Giganet Internet Szolgaltato Kft' },
                          },
                          ip: '45.95.168.157',
                        },
                        fileset: { name: 'auth' },
                        input: { type: 'log' },
                        '@timestamp': '2020-09-04T07:25:28.000Z',
                        system: { auth: { ssh: { event: 'Invalid' } } },
                        ecs: { version: '1.5.0' },
                        related: { ip: ['45.95.168.157'], user: ['webadmin'] },
                        service: { type: 'system' },
                        host: { hostname: 'bastion00', name: 'bastion00.siem.estc.dev' },
                        event: {
                          ingested: '2020-09-04T07:25:30.236651Z',
                          timezone: '+00:00',
                          kind: 'event',
                          module: 'system',
                          action: 'ssh_login',
                          type: ['authentication_failure', 'info'],
                          category: ['authentication'],
                          dataset: 'system.auth',
                          outcome: 'failure',
                        },
                        user: { name: 'webadmin' },
                      },
                      sort: [1599204328000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
        ],
      },
      stack_by_count: { value: 188 },
    },
  },
  total: 21,
  loaded: 21,
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
            docvalue_fields: mockOptions.docValueFields,
            aggregations: {
              stack_by_count: { cardinality: { field: 'user.name' } },
              stack_by: {
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
                        top_hits: {
                          size: 1,
                          _source: [],
                          sort: [{ '@timestamp': { order: 'desc' } }],
                        },
                      },
                    },
                  },
                  successes: {
                    filter: { term: { 'event.outcome': 'success' } },
                    aggs: {
                      lastSuccess: {
                        top_hits: {
                          size: 1,
                          _source: [],
                          sort: [{ '@timestamp': { order: 'desc' } }],
                        },
                      },
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
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
        },
        null,
        2
      ),
    ],
  },
  edges: [
    {
      node: {
        failures: 0,
        successes: 4,
        _id: 'SYSTEM+281',
        stackedValue: ['SYSTEM'],
        lastSuccess: {
          timestamp: ['2020-09-04T13:08:02.532Z'],
          host: { id: ['ce1d3c9b-a815-4643-9641-ada0f2c00609'], name: ['siem-windows'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 0,
        successes: 1,
        _id: 'tsg+1',
        stackedValue: ['tsg'],
        lastSuccess: {
          timestamp: ['2020-09-04T11:49:21.000Z'],
          source: { ip: ['77.183.42.188'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 23,
        successes: 0,
        _id: 'admin+23',
        stackedValue: ['admin'],
        lastFailure: {
          timestamp: ['2020-09-04T13:40:46.000Z'],
          source: { ip: ['59.15.3.197'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 21,
        successes: 0,
        _id: 'user+21',
        stackedValue: ['user'],
        lastFailure: {
          timestamp: ['2020-09-04T13:25:43.000Z'],
          source: { ip: ['64.227.88.245'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 18,
        successes: 0,
        _id: 'ubuntu+18',
        stackedValue: ['ubuntu'],
        lastFailure: {
          timestamp: ['2020-09-04T13:25:07.000Z'],
          source: { ip: ['64.227.88.245'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 17,
        successes: 0,
        _id: 'odoo+17',
        stackedValue: ['odoo'],
        lastFailure: {
          timestamp: ['2020-09-04T12:26:36.000Z'],
          source: { ip: ['180.151.228.166'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 17,
        successes: 0,
        _id: 'pi+17',
        stackedValue: ['pi'],
        lastFailure: {
          timestamp: ['2020-09-04T11:37:22.000Z'],
          source: { ip: ['178.174.148.58'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 14,
        successes: 0,
        _id: 'demo+14',
        stackedValue: ['demo'],
        lastFailure: {
          timestamp: ['2020-09-04T07:23:22.000Z'],
          source: { ip: ['45.95.168.157'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 13,
        successes: 0,
        _id: 'git+13',
        stackedValue: ['git'],
        lastFailure: {
          timestamp: ['2020-09-04T11:20:26.000Z'],
          source: { ip: ['123.206.30.76'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
    {
      node: {
        failures: 13,
        successes: 0,
        _id: 'webadmin+13',
        stackedValue: ['webadmin'],
        lastFailure: {
          timestamp: ['2020-09-04T07:25:28.000Z'],
          source: { ip: ['45.95.168.157'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: '', tiebreaker: null },
    },
  ],
  totalCount: 188,
  pageInfo: { activePage: 0, fakeTotalCount: 50, showMorePagesIndicator: true },
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
    docvalue_fields: mockOptions.docValueFields,
    aggregations: {
      stack_by_count: { cardinality: { field: 'user.name' } },
      stack_by: {
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
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
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

export const mockHit: AuthenticationHit = {
  _index: 'index-123',
  _type: 'type-123',
  _id: 'id-123',
  _score: 10,
  _source: {
    '@timestamp': 'time-1',
  },
  cursor: 'cursor-1',
  sort: [0],
  stackedValue: 'Evan',
  failures: 10,
  successes: 20,
};
