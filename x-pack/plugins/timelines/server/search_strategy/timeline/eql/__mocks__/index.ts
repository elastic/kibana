/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { EqlSearchResponse } from '../../../../../common/search_strategy';

export const sequenceResponse = {
  rawResponse: {
    body: {
      is_partial: false,
      is_running: false,
      took: 527,
      timed_out: false,
      hits: {
        total: {
          value: 10,
          relation: 'eq',
        },
        sequences: [
          {
            join_keys: ['win2019-endpoint-mr-pedro'],
            events: [
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'qhymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIzODAtMTMyNTUwNzg2ODkuOTY1Nzg1NTAw',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    name: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                    executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3377092Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293866,
                    ingested: '2021-02-08T21:57:26.417559711Z',
                    created: '2021-02-08T21:50:28.3377092Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'log_on',
                    id: 'LzzWB9jjGmCwGMvk++++FG/O',
                    category: ['authentication', 'session'],
                    type: ['start'],
                    dataset: 'endpoint.events.security',
                    outcome: 'success',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'qxymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                    executable: 'C:\\Windows\\System32\\lsass.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3377142Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293867,
                    ingested: '2021-02-08T21:57:26.417596906Z',
                    created: '2021-02-08T21:50:28.3377142Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'log_on',
                    id: 'LzzWB9jjGmCwGMvk++++FG/P',
                    category: ['authentication', 'session'],
                    type: ['start'],
                    dataset: 'endpoint.events.security',
                    outcome: 'success',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'rBymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                    executable: 'C:\\Windows\\System32\\lsass.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3381013Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293868,
                    ingested: '2021-02-08T21:57:26.417632166Z',
                    created: '2021-02-08T21:50:28.3381013Z',
                    kind: 'event',
                    module: 'endpoint',
                    id: 'LzzWB9jjGmCwGMvk++++FG/Q',
                    category: [],
                    type: [],
                    dataset: 'endpoint.events.security',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
            ],
          },
          {
            join_keys: ['win2019-endpoint-mr-pedro'],
            events: [
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'qxymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                    executable: 'C:\\Windows\\System32\\lsass.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3377142Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293867,
                    ingested: '2021-02-08T21:57:26.417596906Z',
                    created: '2021-02-08T21:50:28.3377142Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'log_on',
                    id: 'LzzWB9jjGmCwGMvk++++FG/P',
                    category: ['authentication', 'session'],
                    type: ['start'],
                    dataset: 'endpoint.events.security',
                    outcome: 'success',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'rBymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                    executable: 'C:\\Windows\\System32\\lsass.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3381013Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293868,
                    ingested: '2021-02-08T21:57:26.417632166Z',
                    created: '2021-02-08T21:50:28.3381013Z',
                    kind: 'event',
                    module: 'endpoint',
                    id: 'LzzWB9jjGmCwGMvk++++FG/Q',
                    category: [],
                    type: [],
                    dataset: 'endpoint.events.security',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.process-default-2021.02.02-000005',
                _id: 'pxymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIzODAtMTMyNTUwNzg2ODkuOTY1Nzg1NTAw',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                      code_signature: [
                        {
                          trusted: true,
                          subject_name: 'Microsoft Corporation',
                          exists: true,
                          status: 'trusted',
                        },
                      ],
                      token: {
                        integrity_level_name: 'high',
                        elevation_level: 'default',
                      },
                    },
                    args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-y'],
                    parent: {
                      args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-R'],
                      name: 'sshd.exe',
                      pid: 5284,
                      args_count: 2,
                      entity_id:
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                      command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -R',
                      executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                    },
                    code_signature: {
                      trusted: true,
                      subject_name: 'Microsoft Corporation',
                      exists: true,
                      status: 'trusted',
                    },
                    name: 'sshd.exe',
                    pid: 6368,
                    args_count: 2,
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTYzNjgtMTMyNTcyOTQ2MjguMzQ0NjM1NTAw',
                    command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -y',
                    executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                    hash: {
                      sha1: '631244d731f406394c17c7dfd85203e317c74814',
                      sha256: 'e6a972f9db27de18be225095b3b3141b945be8aadc4014c8704ae5acafe3e8e0',
                      md5: '331ba0e529810ef718dd3efbd1242302',
                    },
                  },
                  message: 'Endpoint process event',
                  '@timestamp': '2021-02-08T21:50:28.3446355Z',
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
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293863,
                    ingested: '2021-02-08T21:57:26.417387865Z',
                    created: '2021-02-08T21:50:28.3446355Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'start',
                    id: 'LzzWB9jjGmCwGMvk++++FG/K',
                    category: ['process'],
                    type: ['start'],
                    dataset: 'endpoint.events.process',
                  },
                  user: {
                    domain: '',
                    name: '',
                  },
                },
              },
            ],
          },
          {
            join_keys: ['win2019-endpoint-mr-pedro'],
            events: [
              {
                _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
                _id: 'rBymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                    executable: 'C:\\Windows\\System32\\lsass.exe',
                  },
                  message: 'Endpoint security event',
                  '@timestamp': '2021-02-08T21:50:28.3381013Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.security',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293868,
                    ingested: '2021-02-08T21:57:26.417632166Z',
                    created: '2021-02-08T21:50:28.3381013Z',
                    kind: 'event',
                    module: 'endpoint',
                    id: 'LzzWB9jjGmCwGMvk++++FG/Q',
                    category: [],
                    type: [],
                    dataset: 'endpoint.events.security',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'SYSTEM',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.process-default-2021.02.02-000005',
                _id: 'pxymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIzODAtMTMyNTUwNzg2ODkuOTY1Nzg1NTAw',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                      code_signature: [
                        {
                          trusted: true,
                          subject_name: 'Microsoft Corporation',
                          exists: true,
                          status: 'trusted',
                        },
                      ],
                      token: {
                        integrity_level_name: 'high',
                        elevation_level: 'default',
                      },
                    },
                    args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-y'],
                    parent: {
                      args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-R'],
                      name: 'sshd.exe',
                      pid: 5284,
                      args_count: 2,
                      entity_id:
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                      command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -R',
                      executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                    },
                    code_signature: {
                      trusted: true,
                      subject_name: 'Microsoft Corporation',
                      exists: true,
                      status: 'trusted',
                    },
                    name: 'sshd.exe',
                    pid: 6368,
                    args_count: 2,
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTYzNjgtMTMyNTcyOTQ2MjguMzQ0NjM1NTAw',
                    command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -y',
                    executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                    hash: {
                      sha1: '631244d731f406394c17c7dfd85203e317c74814',
                      sha256: 'e6a972f9db27de18be225095b3b3141b945be8aadc4014c8704ae5acafe3e8e0',
                      md5: '331ba0e529810ef718dd3efbd1242302',
                    },
                  },
                  message: 'Endpoint process event',
                  '@timestamp': '2021-02-08T21:50:28.3446355Z',
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
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293863,
                    ingested: '2021-02-08T21:57:26.417387865Z',
                    created: '2021-02-08T21:50:28.3446355Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'start',
                    id: 'LzzWB9jjGmCwGMvk++++FG/K',
                    category: ['process'],
                    type: ['start'],
                    dataset: 'endpoint.events.process',
                  },
                  user: {
                    domain: '',
                    name: '',
                  },
                },
              },
              {
                _index: '.ds-logs-endpoint.events.network-default-2021.02.02-000005',
                _id: 'qBymg3cBX5UUcOOYP3Ec',
                _source: {
                  agent: {
                    id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                    type: 'endpoint',
                    version: '7.10.0',
                  },
                  process: {
                    Ext: {
                      ancestry: [
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                        'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                      ],
                    },
                    name: 'svchost.exe',
                    pid: 968,
                    entity_id:
                      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTk2OC0xMzI1NTA3ODY3My4yNjQyNDcyMDA=',
                    executable: 'C:\\Windows\\System32\\svchost.exe',
                  },
                  destination: {
                    address: '10.128.0.57',
                    port: 3389,
                    bytes: 1681,
                    ip: '10.128.0.57',
                  },
                  source: {
                    address: '142.202.189.139',
                    port: 16151,
                    bytes: 1224,
                    ip: '142.202.189.139',
                  },
                  message: 'Endpoint network event',
                  network: {
                    transport: 'tcp',
                    type: 'ipv4',
                    direction: 'incoming',
                  },
                  '@timestamp': '2021-02-08T21:50:28.5553532Z',
                  ecs: {
                    version: '1.5.0',
                  },
                  data_stream: {
                    namespace: 'default',
                    type: 'logs',
                    dataset: 'endpoint.events.network',
                  },
                  elastic: {
                    agent: {
                      id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                    },
                  },
                  host: {
                    hostname: 'win2019-endpoint-mr-pedro',
                    os: {
                      Ext: {
                        variant: 'Windows Server 2019 Datacenter',
                      },
                      kernel: '1809 (10.0.17763.1697)',
                      name: 'Windows',
                      family: 'windows',
                      version: '1809 (10.0.17763.1697)',
                      platform: 'windows',
                      full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                    },
                    ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                    name: 'win2019-endpoint-mr-pedro',
                    id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                    mac: ['42:01:0a:80:00:39'],
                    architecture: 'x86_64',
                  },
                  event: {
                    sequence: 3293864,
                    ingested: '2021-02-08T21:57:26.417451347Z',
                    created: '2021-02-08T21:50:28.5553532Z',
                    kind: 'event',
                    module: 'endpoint',
                    action: 'disconnect_received',
                    id: 'LzzWB9jjGmCwGMvk++++FG/L',
                    category: ['network'],
                    type: ['end'],
                    dataset: 'endpoint.events.network',
                  },
                  user: {
                    domain: 'NT AUTHORITY',
                    name: 'NETWORK SERVICE',
                  },
                },
              },
            ],
          },
        ],
      },
    },
    statusCode: 200,
    headers: {},
    meta: {},
    hits: {},
  },
} as unknown as EqlSearchStrategyResponse<EqlSearchResponse<unknown>>;

export const eventsResponse = {
  rawResponse: {
    body: {
      is_partial: false,
      is_running: false,
      took: 527,
      timed_out: false,
      hits: {
        total: {
          value: 10,
          relation: 'eq',
        },
        events: [
          {
            _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
            _id: 'qhymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIzODAtMTMyNTUwNzg2ODkuOTY1Nzg1NTAw',
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                },
                name: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
              },
              message: 'Endpoint security event',
              '@timestamp': '2021-02-08T21:50:28.3377092Z',
              ecs: {
                version: '1.5.0',
              },
              data_stream: {
                namespace: 'default',
                type: 'logs',
                dataset: 'endpoint.events.security',
              },
              elastic: {
                agent: {
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293866,
                ingested: '2021-02-08T21:57:26.417559711Z',
                created: '2021-02-08T21:50:28.3377092Z',
                kind: 'event',
                module: 'endpoint',
                action: 'log_on',
                id: 'LzzWB9jjGmCwGMvk++++FG/O',
                category: ['authentication', 'session'],
                type: ['start'],
                dataset: 'endpoint.events.security',
                outcome: 'success',
              },
              user: {
                domain: 'NT AUTHORITY',
                name: 'SYSTEM',
              },
            },
          },
          {
            _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
            _id: 'qxymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                },
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                executable: 'C:\\Windows\\System32\\lsass.exe',
              },
              message: 'Endpoint security event',
              '@timestamp': '2021-02-08T21:50:28.3377142Z',
              ecs: {
                version: '1.5.0',
              },
              data_stream: {
                namespace: 'default',
                type: 'logs',
                dataset: 'endpoint.events.security',
              },
              elastic: {
                agent: {
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293867,
                ingested: '2021-02-08T21:57:26.417596906Z',
                created: '2021-02-08T21:50:28.3377142Z',
                kind: 'event',
                module: 'endpoint',
                action: 'log_on',
                id: 'LzzWB9jjGmCwGMvk++++FG/P',
                category: ['authentication', 'session'],
                type: ['start'],
                dataset: 'endpoint.events.security',
                outcome: 'success',
              },
              user: {
                domain: 'NT AUTHORITY',
                name: 'SYSTEM',
              },
            },
          },
          {
            _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
            _id: 'rBymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                },
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                executable: 'C:\\Windows\\System32\\lsass.exe',
              },
              message: 'Endpoint security event',
              '@timestamp': '2021-02-08T21:50:28.3381013Z',
              ecs: {
                version: '1.5.0',
              },
              data_stream: {
                namespace: 'default',
                type: 'logs',
                dataset: 'endpoint.events.security',
              },
              elastic: {
                agent: {
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293868,
                ingested: '2021-02-08T21:57:26.417632166Z',
                created: '2021-02-08T21:50:28.3381013Z',
                kind: 'event',
                module: 'endpoint',
                id: 'LzzWB9jjGmCwGMvk++++FG/Q',
                category: [],
                type: [],
                dataset: 'endpoint.events.security',
              },
              user: {
                domain: 'NT AUTHORITY',
                name: 'SYSTEM',
              },
            },
          },
          {
            _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
            _id: 'qxymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                },
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                executable: 'C:\\Windows\\System32\\lsass.exe',
              },
              message: 'Endpoint security event',
              '@timestamp': '2021-02-08T21:50:28.3377142Z',
              ecs: {
                version: '1.5.0',
              },
              data_stream: {
                namespace: 'default',
                type: 'logs',
                dataset: 'endpoint.events.security',
              },
              elastic: {
                agent: {
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293867,
                ingested: '2021-02-08T21:57:26.417596906Z',
                created: '2021-02-08T21:50:28.3377142Z',
                kind: 'event',
                module: 'endpoint',
                action: 'log_on',
                id: 'LzzWB9jjGmCwGMvk++++FG/P',
                category: ['authentication', 'session'],
                type: ['start'],
                dataset: 'endpoint.events.security',
                outcome: 'success',
              },
              user: {
                domain: 'NT AUTHORITY',
                name: 'SYSTEM',
              },
            },
          },
          {
            _index: '.ds-logs-endpoint.events.security-default-2021.02.05-000005',
            _id: 'rBymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                },
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
                executable: 'C:\\Windows\\System32\\lsass.exe',
              },
              message: 'Endpoint security event',
              '@timestamp': '2021-02-08T21:50:28.3381013Z',
              ecs: {
                version: '1.5.0',
              },
              data_stream: {
                namespace: 'default',
                type: 'logs',
                dataset: 'endpoint.events.security',
              },
              elastic: {
                agent: {
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293868,
                ingested: '2021-02-08T21:57:26.417632166Z',
                created: '2021-02-08T21:50:28.3381013Z',
                kind: 'event',
                module: 'endpoint',
                id: 'LzzWB9jjGmCwGMvk++++FG/Q',
                category: [],
                type: [],
                dataset: 'endpoint.events.security',
              },
              user: {
                domain: 'NT AUTHORITY',
                name: 'SYSTEM',
              },
            },
          },
          {
            _index: '.ds-logs-endpoint.events.process-default-2021.02.02-000005',
            _id: 'pxymg3cBX5UUcOOYP3Ec',
            _source: {
              agent: {
                id: '1d15cf9e-3dc7-5b97-f586-743f7c2518b2',
                type: 'endpoint',
                version: '7.10.0',
              },
              process: {
                Ext: {
                  ancestry: [
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIzODAtMTMyNTUwNzg2ODkuOTY1Nzg1NTAw',
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU2OC0xMzI1NTA3ODY2Ny4zMjk3MDY2MDA=',
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQ2OC0xMzI1NTA3ODY2NS42Mzg5MzY1MDA=',
                  ],
                  code_signature: [
                    {
                      trusted: true,
                      subject_name: 'Microsoft Corporation',
                      exists: true,
                      status: 'trusted',
                    },
                  ],
                  token: {
                    integrity_level_name: 'high',
                    elevation_level: 'default',
                  },
                },
                args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-y'],
                parent: {
                  args: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe', '-R'],
                  name: 'sshd.exe',
                  pid: 5284,
                  args_count: 2,
                  entity_id:
                    'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw',
                  command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -R',
                  executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                },
                code_signature: {
                  trusted: true,
                  subject_name: 'Microsoft Corporation',
                  exists: true,
                  status: 'trusted',
                },
                name: 'sshd.exe',
                pid: 6368,
                args_count: 2,
                entity_id:
                  'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTYzNjgtMTMyNTcyOTQ2MjguMzQ0NjM1NTAw',
                command_line: '"C:\\Program Files\\OpenSSH-Win64\\sshd.exe" -y',
                executable: 'C:\\Program Files\\OpenSSH-Win64\\sshd.exe',
                hash: {
                  sha1: '631244d731f406394c17c7dfd85203e317c74814',
                  sha256: 'e6a972f9db27de18be225095b3b3141b945be8aadc4014c8704ae5acafe3e8e0',
                  md5: '331ba0e529810ef718dd3efbd1242302',
                },
              },
              message: 'Endpoint process event',
              '@timestamp': '2021-02-08T21:50:28.3446355Z',
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
                  id: 'f5dec71e-438c-424e-ac9b-0281f10412b9',
                },
              },
              host: {
                hostname: 'win2019-endpoint-mr-pedro',
                os: {
                  Ext: {
                    variant: 'Windows Server 2019 Datacenter',
                  },
                  kernel: '1809 (10.0.17763.1697)',
                  name: 'Windows',
                  family: 'windows',
                  version: '1809 (10.0.17763.1697)',
                  platform: 'windows',
                  full: 'Windows Server 2019 Datacenter 1809 (10.0.17763.1697)',
                },
                ip: ['10.128.0.57', 'fe80::9ced:8f1c:880b:3e1f', '127.0.0.1', '::1'],
                name: 'win2019-endpoint-mr-pedro',
                id: 'd8ad572e-d224-4044-a57d-f5a84c0dfe5d',
                mac: ['42:01:0a:80:00:39'],
                architecture: 'x86_64',
              },
              event: {
                sequence: 3293863,
                ingested: '2021-02-08T21:57:26.417387865Z',
                created: '2021-02-08T21:50:28.3446355Z',
                kind: 'event',
                module: 'endpoint',
                action: 'start',
                id: 'LzzWB9jjGmCwGMvk++++FG/K',
                category: ['process'],
                type: ['start'],
                dataset: 'endpoint.events.process',
              },
              user: {
                domain: '',
                name: '',
              },
            },
          },
        ],
      },
    },
    statusCode: 200,
    headers: {},
    meta: {},
    hits: {},
  },
} as unknown as EqlSearchStrategyResponse<EqlSearchResponse<unknown>>;
