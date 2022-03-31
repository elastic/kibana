/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Process,
  ProcessEvent,
  ProcessEventsPage,
  ProcessFields,
  EventAction,
  EventKind,
  ProcessMap,
} from '../../types/process_tree';

export const mockEvents: ProcessEvent[] = [
  {
    '@timestamp': '2021-11-23T15:25:04.210Z',
    user: {
      name: 'vagrant',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3535,
      user: {
        name: 'vagrant',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      executable: '/usr/bin/bash',
      command_line: 'bash',
      interactive: false,
      entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
      parent: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.210Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.210Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.210Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.210Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      name: '',
      args_count: 0,
      args: [],
      working_directory: '/home/vagrant',
      start: '2021-11-23T15:25:04.210Z',
    },
    event: {
      action: EventAction.fork,
      category: 'process',
      kind: EventKind.event,
    },
    host: {
      architecture: 'x86_64',
      hostname: 'james-fleet-714-2',
      id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
      ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
      mac: '42:01:0a:84:00:32',
      name: 'james-fleet-714-2',
      os: {
        family: 'centos',
        full: 'CentOS 7.9.2009',
        kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
        name: 'Linux',
        platform: 'centos',
        version: '7.9.2009',
      },
    },
  },
  {
    '@timestamp': '2021-11-23T15:25:04.218Z',
    user: {
      name: 'vagrant',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3535,
      user: {
        name: 'vagrant',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      executable: '/usr/bin/vi',
      command_line: 'bash',
      interactive: true,
      entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
      parent: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.218Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.218Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.218Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 3535,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/vi',
        command_line: 'bash',
        interactive: true,
        entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      name: '',
      args_count: 2,
      args: ['vi', 'cmd/config.ini'],
      working_directory: '/home/vagrant',
      start: '2021-11-23T15:25:04.218Z',
    },
    event: {
      action: EventAction.exec,
      category: 'process',
      kind: EventKind.event,
    },
  },
  {
    '@timestamp': '2021-11-23T15:25:05.202Z',
    user: {
      name: 'vagrant',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3535,
      user: {
        name: 'vagrant',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      exit_code: 137,
      executable: '/usr/bin/vi',
      command_line: 'bash',
      interactive: true,
      entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3728',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
      parent: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 3535,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        exit_code: 137,
        executable: '/usr/bin/vi',
        command_line: 'bash',
        interactive: true,
        entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3728',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      start: '2021-11-23T15:25:05.202Z',
      name: '',
      args_count: 2,
      args: ['vi', 'cmd/config.ini'],
      working_directory: '/home/vagrant',
    },
    event: {
      action: EventAction.end,
      category: 'process',
      kind: EventKind.event,
    },
    host: {
      architecture: 'x86_64',
      hostname: 'james-fleet-714-2',
      id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
      ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
      mac: '42:01:0a:84:00:32',
      name: 'james-fleet-714-2',
      os: {
        family: 'centos',
        full: 'CentOS 7.9.2009',
        kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
        name: 'Linux',
        platform: 'centos',
        version: '7.9.2009',
      },
    },
  },
  {
    '@timestamp': '2021-11-23T15:25:05.202Z',
    user: {
      name: '',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3536,
      user: {
        name: '',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      exit_code: 137,
      executable: '/usr/bin/cat',
      command_line: 'bash',
      interactive: true,
      entity_id: '7e4daeb2-4a4e-56c4-980e-f0dcfdbc3728',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
      parent: {
        pid: 2442,
        user: {
          name: '',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: '',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: '',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 2442,
        user: {
          name: '',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.202Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      start: '2021-11-23T15:25:05.202Z',
      name: '',
      args_count: 2,
      args: ['cat'],
      working_directory: '/home/vagrant',
    },
    event: {
      action: EventAction.end,
      category: 'process',
      kind: EventKind.event,
    },
    host: {
      architecture: 'x86_64',
      hostname: 'james-fleet-714-2',
      id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
      ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
      mac: '42:01:0a:84:00:32',
      name: 'james-fleet-714-2',
      os: {
        family: 'centos',
        full: 'CentOS 7.9.2009',
        kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
        name: 'Linux',
        platform: 'centos',
        version: '7.9.2009',
      },
    },
  },
] as ProcessEvent[];

export const mockAlerts: ProcessEvent[] = [
  {
    kibana: {
      alert: {
        rule: {
          category: 'Custom Query Rule',
          consumer: 'siem',
          name: 'cmd test alert',
          uuid: '709d3890-4c71-11ec-8c67-01ccde9db9bf',
          enabled: true,
          description: 'cmd test alert',
          risk_score: 21,
          severity: 'low',
          query: "process.executable: '/usr/bin/vi'",
        },
        status: 'active',
        workflow_status: 'open',
        reason: 'process event created low alert cmd test alert.',
        original_time: new Date('2021-11-23T15:25:04.218Z'),
        original_event: {
          action: 'exec',
        },
        uuid: '6bb22512e0e588d1a2449b61f164b216e366fba2de39e65d002ae734d71a6c38',
      },
    },
    '@timestamp': '2021-11-23T15:26:34.859Z',
    user: {
      name: 'vagrant',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3535,
      user: {
        name: 'vagrant',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      executable: '/usr/bin/vi',
      command_line: 'bash',
      interactive: true,
      entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
      parent: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.859Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.859Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.859Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args: [],
        args_count: 0,
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.859Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      name: '',
      args_count: 2,
      args: ['vi', 'cmd/config.ini'],
      working_directory: '/home/vagrant',
      start: '2021-11-23T15:26:34.859Z',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
    },
    event: {
      action: EventAction.exec,
      category: 'process',
      kind: EventKind.signal,
    },
    host: {
      architecture: 'x86_64',
      hostname: 'james-fleet-714-2',
      id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
      ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
      mac: '42:01:0a:84:00:32',
      name: 'james-fleet-714-2',
      os: {
        family: 'centos',
        full: 'CentOS 7.9.2009',
        kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
        name: 'Linux',
        platform: 'centos',
        version: '7.9.2009',
      },
    },
  },
  {
    kibana: {
      alert: {
        rule: {
          category: 'Custom Query Rule',
          consumer: 'siem',
          name: 'cmd test alert',
          uuid: '709d3890-4c71-11ec-8c67-01ccde9db9bf',
          enabled: true,
          description: 'cmd test alert',
          risk_score: 21,
          severity: 'low',
          query: "process.executable: '/usr/bin/vi'",
        },
        status: 'active',
        workflow_status: 'open',
        reason: 'process event created low alert cmd test alert.',
        original_time: new Date('2021-11-23T15:25:05.202Z'),
        original_event: {
          action: 'exit',
        },
        uuid: '2873463965b70d37ab9b2b3a90ac5a03b88e76e94ad33568285cadcefc38ed75',
      },
    },
    '@timestamp': '2021-11-23T15:26:34.860Z',
    user: {
      name: 'vagrant',
      id: '1000',
    },
    group: {
      id: '1000',
      name: 'vagrant',
    },
    process: {
      pid: 3535,
      user: {
        name: 'vagrant',
        id: '1000',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      exit_code: 137,
      executable: '/usr/bin/vi',
      command_line: 'bash',
      interactive: true,
      entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
      parent: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args_count: 2,
        args: ['vi', 'cmd/config.ini'],
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.860Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      session_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args_count: 2,
        args: ['vi', 'cmd/config.ini'],
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.860Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      entry_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args_count: 2,
        args: ['vi', 'cmd/config.ini'],
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.860Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      group_leader: {
        pid: 2442,
        user: {
          name: 'vagrant',
          id: '1000',
        },
        group: {
          id: '1000',
          name: 'vagrant',
        },
        executable: '/usr/bin/bash',
        command_line: 'bash',
        interactive: true,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
        name: '',
        args_count: 2,
        args: ['vi', 'cmd/config.ini'],
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:26:34.860Z',
        tty: {
          char_device: {
            major: 8,
            minor: 1,
          },
        },
      },
      name: '',
      args_count: 2,
      args: ['vi', 'cmd/config.ini'],
      working_directory: '/home/vagrant',
      start: '2021-11-23T15:26:34.860Z',
      tty: {
        char_device: {
          major: 8,
          minor: 1,
        },
      },
    },
    event: {
      action: EventAction.end,
      category: 'process',
      kind: EventKind.signal,
    },
    host: {
      architecture: 'x86_64',
      hostname: 'james-fleet-714-2',
      id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
      ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
      mac: '42:01:0a:84:00:32',
      name: 'james-fleet-714-2',
      os: {
        family: 'centos',
        full: 'CentOS 7.9.2009',
        kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
        name: 'Linux',
        platform: 'centos',
        version: '7.9.2009',
      },
    },
  },
];

export const mockData: ProcessEventsPage[] = [
  {
    events: mockEvents,
    cursor: '2021-11-23T15:25:04.210Z',
  },
];

export const childProcessMock: Process = {
  id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bd',
  events: [],
  alerts: [],
  children: [],
  autoExpand: false,
  searchMatched: null,
  parent: undefined,
  orphans: [],
  addEvent: (_) => undefined,
  addAlert: (_) => undefined,
  clearSearch: () => undefined,
  getChildren: () => [],
  hasOutput: () => false,
  hasAlerts: () => false,
  getAlerts: () => [],
  updateAlertsStatus: (_) => undefined,
  hasExec: () => false,
  getOutput: () => '',
  getDetails: () =>
    ({
      '@timestamp': '2021-11-23T15:25:05.210Z',
      event: {
        kind: EventKind.event,
        category: 'process',
        action: EventAction.exec,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'james-fleet-714-2',
        id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
        ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
        mac: '42:01:0a:84:00:32',
        name: 'james-fleet-714-2',
        os: {
          family: 'centos',
          full: 'CentOS 7.9.2009',
          kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
          name: 'Linux',
          platform: 'centos',
          version: '7.9.2009',
        },
      },
      user: {
        id: '1',
        name: 'vagrant',
      },
      process: {
        args: ['ls', '-l'],
        args_count: 2,
        entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bd',
        executable: '/bin/ls',
        interactive: true,
        name: 'ls',
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:05.210Z',
        pid: 2,
        parent: {
          args: ['bash'],
          args_count: 1,
          entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
          executable: '/bin/bash',
          interactive: false,
          name: '',
          working_directory: '/home/vagrant',
          start: '2021-11-23T15:25:04.210Z',
          pid: 1,
          user: {
            id: '1',
            name: 'vagrant',
          },
        },
        session_leader: {} as ProcessFields,
        entry_leader: {} as ProcessFields,
        group_leader: {} as ProcessFields,
      },
    } as ProcessEvent),
  isUserEntered: () => false,
  getMaxAlertLevel: () => null,
};

export const processMock: Process = {
  id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
  events: [],
  alerts: [],
  children: [],
  autoExpand: false,
  searchMatched: null,
  parent: undefined,
  orphans: [],
  addEvent: (_) => undefined,
  addAlert: (_) => undefined,
  clearSearch: () => undefined,
  getChildren: () => [],
  hasOutput: () => false,
  hasAlerts: () => false,
  getAlerts: () => [],
  updateAlertsStatus: (_) => undefined,
  hasExec: () => false,
  getOutput: () => '',
  getDetails: () =>
    ({
      '@timestamp': '2021-11-23T15:25:04.210Z',
      event: {
        kind: EventKind.event,
        category: 'process',
        action: EventAction.exec,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'james-fleet-714-2',
        id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
        ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
        mac: '42:01:0a:84:00:32',
        name: 'james-fleet-714-2',
        os: {
          family: 'centos',
          full: 'CentOS 7.9.2009',
          kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
          name: 'Linux',
          platform: 'centos',
          version: '7.9.2009',
        },
      },
      user: {
        id: '1000',
        name: 'vagrant',
      },
      group: {
        id: '1000',
        name: 'vagrant',
      },
      process: {
        args: ['bash'],
        args_count: 1,
        entity_id: '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726',
        executable: '/bin/bash',
        exit_code: 137,
        interactive: false,
        name: '',
        working_directory: '/home/vagrant',
        start: '2021-11-23T15:25:04.210Z',
        pid: 1,
        parent: {
          pid: 2442,
          user: {
            name: 'vagrant',
            id: '1000',
          },
          group: {
            id: '1000',
            name: 'vagrant',
          },
          executable: '/usr/bin/bash',
          command_line: 'bash',
          interactive: true,
          entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
          name: '',
          args: [],
          args_count: 0,
          working_directory: '/home/vagrant',
          start: '2021-11-23T15:26:34.859Z',
          tty: {
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        } as ProcessFields,
        session_leader: {
          pid: 2442,
          user: {
            name: 'vagrant',
            id: '1000',
          },
          group: {
            id: '1000',
            name: 'vagrant',
          },
          executable: '/usr/bin/bash',
          command_line: 'bash',
          interactive: true,
          entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
          name: '',
          args: [],
          args_count: 0,
          working_directory: '/home/vagrant',
          start: '2021-11-23T15:26:34.859Z',
          tty: {
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        } as ProcessFields,
        entry_leader: {
          pid: 2442,
          user: {
            name: 'vagrant',
            id: '1000',
          },
          group: {
            id: '1000',
            name: 'vagrant',
          },
          executable: '/usr/bin/bash',
          command_line: 'bash',
          interactive: true,
          entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
          name: '',
          args: [],
          args_count: 0,
          working_directory: '/home/vagrant',
          start: '2021-11-23T15:26:34.859Z',
          tty: {
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        } as ProcessFields,
        group_leader: {
          pid: 2442,
          user: {
            name: 'vagrant',
            id: '1000',
          },
          group: {
            id: '1000',
            name: 'vagrant',
          },
          executable: '/usr/bin/bash',
          command_line: 'bash',
          interactive: true,
          entity_id: '3d0192c6-7c54-5ee6-a110-3539a7cf42bc',
          name: '',
          args: [],
          args_count: 0,
          working_directory: '/home/vagrant',
          start: '2021-11-23T15:26:34.859Z',
          tty: {
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        } as ProcessFields,
      },
    } as ProcessEvent),
  isUserEntered: () => false,
  getMaxAlertLevel: () => null,
};

export const sessionViewBasicProcessMock: Process = {
  ...processMock,
  events: mockEvents,
  hasExec: () => true,
  isUserEntered: () => true,
};

export const sessionViewAlertProcessMock: Process = {
  ...processMock,
  events: mockEvents,
  alerts: mockAlerts,
  hasAlerts: () => true,
  getAlerts: () => mockAlerts,
  hasExec: () => true,
  isUserEntered: () => true,
};

export const mockProcessMap = mockEvents.reduce(
  (processMap, event) => {
    processMap[event.process.entity_id] = {
      id: event.process.entity_id,
      events: [event],
      alerts: [],
      children: [],
      parent: undefined,
      autoExpand: false,
      searchMatched: null,
      orphans: [],
      addEvent: (_) => undefined,
      addAlert: (_) => undefined,
      clearSearch: () => undefined,
      getChildren: () => [],
      hasOutput: () => false,
      hasAlerts: () => false,
      getAlerts: () => [],
      updateAlertsStatus: (_) => undefined,
      hasExec: () => false,
      getOutput: () => '',
      getDetails: () => event,
      isUserEntered: () => false,
      getMaxAlertLevel: () => null,
    };
    return processMap;
  },
  {
    [sessionViewBasicProcessMock.id]: sessionViewBasicProcessMock,
  } as ProcessMap
);
