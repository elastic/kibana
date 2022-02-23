/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessEventResults } from '../../types/process_tree';

export const sessionViewProcessEventsMock: ProcessEventResults = {
  events: [
    {
      _index: 'cmd',
      _id: 'FMUGTX0BGGlsPv9flMF7',
      _score: null,
      _source: {
        '@timestamp': '2021-11-23T13:40:16.528Z',
        event: {
          kind: 'event',
          category: 'process',
          action: 'fork',
        },
        host: {
          architecture: 'x86_64',
          hostname: 'james-fleet-714-2',
          id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
          ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
          mac: '42:01:0a:84:00:32',
          name: 'james-fleet-714-2',
          os: {
            Ext: {
              variant: 'CentOS',
            },
            family: 'centos',
            full: 'CentOS 7.9.2009',
            kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
            name: 'Linux',
            platform: 'centos',
            version: '7.9.2009',
          },
        },
        user: {
          // To keep backwards compat and avoid data duplication. We keep user/group info for top level process at the top level
          id: '0', // the effective user aka euid
          name: 'root',
          real: {
            // ruid
            id: '2',
            name: 'kg',
          },
          saved: {
            // suid
            id: '2',
            name: 'kg',
          },
        },
        group: {
          id: '1', // the effective group aka egid
          name: 'groupA',
          real: {
            // rgid
            id: '1',
            name: 'groupA',
          },
          saved: {
            // sgid
            id: '1',
            name: 'groupA',
          },
        },
        process: {
          entity_id: '4321',
          args: ['/bin/sshd'],
          args_count: 1,
          command_line: 'sshd',
          executable: '/bin/sshd',
          name: 'sshd',
          interactive: false,
          working_directory: '/',
          pid: 3,
          start: '2021-10-14T08:05:34.853Z',
          parent: {
            entity_id: '4322',
            args: ['/bin/sshd'],
            args_count: 1,
            command_line: 'sshd',
            executable: '/bin/sshd',
            name: 'sshd',
            interactive: true,
            working_directory: '/',
            pid: 2,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '2',
              name: 'kg',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            group_leader: {
              entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
              pid: 1234, // this directly replaces parent.pgid
              start: '2021-10-14T08:05:34.853Z',
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          group_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          session_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the session_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          entry_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the entry_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            entry_meta: {
              type: 'sshd',
              source: {
                ip: '10.132.0.50',
                geo: {
                  city_name: 'Vancouver',
                  continent_code: 'NA',
                  continent_name: 'North America',
                  country_iso_code: 'CA',
                  country_name: 'Canada',
                  location: {
                    lon: -73.61483,
                    lat: 45.505918,
                  },
                  postal_code: 'V9J1E3',
                  region_iso_code: 'BC',
                  region_name: 'British Columbia',
                  timezone: 'America/Los_Angeles',
                },
              },
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          file_descriptions: [
            {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
            {
              descriptor: 1,
              type: 'pipe',
              pipe: {
                inode: '6183207',
              },
            },
          ],
          tty: {
            descriptor: 0,
            type: 'char_device',
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        },
      },
      sort: [1637674816528],
    },
    {
      _index: 'cmd',
      _id: 'FsUGTX0BGGlsPv9flMGF',
      _score: null,
      _source: {
        '@timestamp': '2021-11-23T13:40:16.541Z',
        event: {
          kind: 'event',
          category: 'process',
          action: 'exec',
        },
        host: {
          architecture: 'x86_64',
          hostname: 'james-fleet-714-2',
          id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
          ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
          mac: '42:01:0a:84:00:32',
          name: 'james-fleet-714-2',
          os: {
            Ext: {
              variant: 'CentOS',
            },
            family: 'centos',
            full: 'CentOS 7.9.2009',
            kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
            name: 'Linux',
            platform: 'centos',
            version: '7.9.2009',
          },
        },
        user: {
          id: '2',
          name: 'kg',
          real: {
            id: '2',
            name: 'kg',
          },
          saved: {
            id: '2',
            name: 'kg',
          },
        },
        group: {
          id: '1',
          name: 'groupA',
          real: {
            id: '1',
            name: 'groupA',
          },
          saved: {
            id: '1',
            name: 'groupA',
          },
          supplemental: [
            {
              id: '2',
              name: 'groupB',
            },
            {
              id: '3',
              name: 'groupC',
            },
          ],
        },
        process: {
          entity_id: '4321',
          args: ['/bin/bash'],
          args_count: 1,
          command_line: 'bash',
          executable: '/bin/bash',
          name: 'bash',
          interactive: true,
          working_directory: '/home/kg',
          pid: 3,
          start: '2021-10-14T08:05:34.853Z',
          previous: [{ args: ['/bin/sshd'], args_count: 1, executable: '/bin/sshd' }],
          parent: {
            entity_id: '4322',
            args: ['/bin/sshd'],
            args_count: 1,
            command_line: 'sshd',
            executable: '/bin/sshd',
            name: 'sshd',
            interactive: true,
            working_directory: '/',
            pid: 2,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            group_leader: {
              entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
              pid: 1234, // this directly replaces parent.pgid
              start: '2021-10-14T08:05:34.853Z',
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          group_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          session_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the session_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          entry_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the entry_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            entry_meta: {
              type: 'sshd',
              source: {
                ip: '10.132.0.50',
                geo: {
                  city_name: 'Vancouver',
                  continent_code: 'NA',
                  continent_name: 'North America',
                  country_iso_code: 'CA',
                  country_name: 'Canada',
                  location: {
                    lon: -73.61483,
                    lat: 45.505918,
                  },
                  postal_code: 'V9J1E3',
                  region_iso_code: 'BC',
                  region_name: 'British Columbia',
                  timezone: 'America/Los_Angeles',
                },
              },
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          file_descriptions: [
            {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
            {
              descriptor: 1,
              type: 'pipe',
              pipe: {
                inode: '6183207',
              },
            },
          ],
          tty: {
            descriptor: 0,
            type: 'char_device',
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        },
      },
      sort: [1637674816541],
    },
    {
      _index: 'cmd',
      _id: 'H8UGTX0BGGlsPv9fp8F_',
      _score: null,
      _source: {
        '@timestamp': '2021-11-23T13:40:21.392Z',
        event: {
          kind: 'event',
          category: 'process',
          action: 'end',
        },
        host: {
          architecture: 'x86_64',
          hostname: 'james-fleet-714-2',
          id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
          ip: '127.0.0.1,::1,10.132.0.50,fe80::7d39:3147:4d9a:f809',
          mac: '42:01:0a:84:00:32',
          name: 'james-fleet-714-2',
          os: {
            Ext: {
              variant: 'CentOS',
            },
            family: 'centos',
            full: 'CentOS 7.9.2009',
            kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
            name: 'Linux',
            platform: 'centos',
            version: '7.9.2009',
          },
        },
        user: {
          id: '2',
          name: 'kg',
          real: {
            id: '2',
            name: 'kg',
          },
          saved: {
            id: '2',
            name: 'kg',
          },
        },
        group: {
          id: '1',
          name: 'groupA',
          real: {
            id: '1',
            name: 'groupA',
          },
          saved: {
            id: '1',
            name: 'groupA',
          },
          supplemental: [
            {
              id: '2',
              name: 'groupB',
            },
            {
              id: '3',
              name: 'groupC',
            },
          ],
        },
        process: {
          entity_id: '4321',
          args: ['/bin/bash'],
          args_count: 1,
          command_line: 'bash',
          executable: '/bin/bash',
          name: 'bash',
          interactive: true,
          working_directory: '/home/kg',
          pid: 3,
          start: '2021-10-14T08:05:34.853Z',
          end: '2021-10-14T10:05:34.853Z',
          exit_code: 137,
          previous: [{ args: ['/bin/sshd'], args_count: 1, executable: '/bin/sshd' }],
          parent: {
            entity_id: '4322',
            args: ['/bin/sshd'],
            args_count: 1,
            command_line: 'sshd',
            executable: '/bin/sshd',
            name: 'sshd',
            interactive: true,
            working_directory: '/',
            pid: 2,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            group_leader: {
              entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
              pid: 1234, // this directly replaces parent.pgid
              start: '2021-10-14T08:05:34.853Z',
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          group_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          session_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the session_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          entry_leader: {
            entity_id: '4321',
            args: ['bash'],
            args_count: 1,
            command_line: 'bash',
            executable: '/bin/bash',
            name: 'bash',
            interactive: true,
            working_directory: '/home/kg',
            pid: 3,
            start: '2021-10-14T08:05:34.853Z',
            user: {
              id: '0',
              name: 'root',
              real: {
                id: '0',
                name: 'root',
              },
              saved: {
                id: '0',
                name: 'root',
              },
            },
            group: {
              id: '1',
              name: 'groupA',
              real: {
                id: '1',
                name: 'groupA',
              },
              saved: {
                id: '1',
                name: 'groupA',
              },
              supplemental: [
                {
                  id: '2',
                  name: 'groupB',
                },
                {
                  id: '3',
                  name: 'groupC',
                },
              ],
            },
            // parent: {
            //   entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //   pid: 2,
            //   start: '2021-10-14T08:05:34.853Z',
            //   session_leader: {
            //     // used as a foreign key to the parent session of the entry_leader
            //     entity_id: '0fe5f6a0-6f04-49a5-8faf-768445b38d16',
            //     pid: 4321,
            //     start: '2021-10-14T08:05:34.853Z',
            //   },
            // },
            entry_meta: {
              type: 'sshd',
              source: {
                ip: '10.132.0.50',
                geo: {
                  city_name: 'Vancouver',
                  continent_code: 'NA',
                  continent_name: 'North America',
                  country_iso_code: 'CA',
                  country_name: 'Canada',
                  location: {
                    lon: -73.61483,
                    lat: 45.505918,
                  },
                  postal_code: 'V9J1E3',
                  region_iso_code: 'BC',
                  region_name: 'British Columbia',
                  timezone: 'America/Los_Angeles',
                },
              },
            },
            file_descriptions: [
              {
                descriptor: 0,
                type: 'char_device',
                char_device: {
                  major: 8,
                  minor: 1,
                },
              },
            ],
            tty: {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
          },
          file_descriptions: [
            {
              descriptor: 0,
              type: 'char_device',
              char_device: {
                major: 8,
                minor: 1,
              },
            },
            {
              descriptor: 1,
              type: 'pipe',
              pipe: {
                inode: '6183207',
              },
            },
          ],
          tty: {
            descriptor: 0,
            type: 'char_device',
            char_device: {
              major: 8,
              minor: 1,
            },
          },
        },
      },
      sort: [1637674821392],
    },
  ],
};
