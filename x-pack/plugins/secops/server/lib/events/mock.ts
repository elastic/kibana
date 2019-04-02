/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestDetailsOptions } from './types';

export const mockResponseSearchTimelineDetails = {
  took: 5,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 1,
      relation: 'eq',
    },
    max_score: 1,
    hits: [
      {
        _index: 'auditbeat-8.0.0-2019.03.29-000003',
        _type: '_doc',
        _id: 'TUfUymkBCQofM5eXGBYL',
        _score: 1,
        _source: {
          '@timestamp': '2019-03-29T19:01:23.420Z',
          service: {
            type: 'auditd',
          },
          user: {
            audit: {
              id: 'unset',
            },
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              group: {
                id: '0',
                name: 'root',
              },
              id: '0',
              name: 'root',
            },
            filesystem: {
              group: {
                name: 'root',
                id: '0',
              },
              name: 'root',
              id: '0',
            },
            saved: {
              group: {
                id: '0',
                name: 'root',
              },
              id: '0',
              name: 'root',
            },
            id: '0',
            name: 'root',
          },
          process: {
            executable: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
            working_directory: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat',
            pid: 15990,
            ppid: 1,
            title:
              '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat -e -c /root/go/src/github.com/elastic/beats/x-pack/auditbeat/au',
            name: 'auditbeat',
          },
          host: {
            architecture: 'x86_64',
            os: {
              name: 'Ubuntu',
              kernel: '4.15.0-45-generic',
              codename: 'bionic',
              platform: 'ubuntu',
              version: '18.04.2 LTS (Bionic Beaver)',
              family: 'debian',
            },
            id: '7c21f5ed03b04d0299569d221fe18bbc',
            containerized: false,
            name: 'zeek-london',
            ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
            mac: ['42:66:42:19:b3:b9'],
            hostname: 'zeek-london',
          },
          cloud: {
            provider: 'digitalocean',
            instance: {
              id: '136398786',
            },
            region: 'lon1',
          },
          file: {
            device: '00:00',
            inode: '3926',
            mode: '0644',
            uid: '0',
            gid: '0',
            owner: 'root',
            group: 'root',
            path: '/etc/passwd',
          },
          auditd: {
            session: 'unset',
            data: {
              tty: '(none)',
              a3: '0',
              a2: '80000',
              syscall: 'openat',
              a1: '7fe0f63df220',
              a0: 'ffffff9c',
              arch: 'x86_64',
              exit: '12',
            },
            summary: {
              actor: {
                primary: 'unset',
                secondary: 'root',
              },
              object: {
                primary: '/etc/passwd',
                type: 'file',
              },
              how: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
            },
            paths: [
              {
                rdev: '00:00',
                cap_fe: '0',
                nametype: 'NORMAL',
                ogid: '0',
                ouid: '0',
                inode: '3926',
                item: '0',
                mode: '0100644',
                name: '/etc/passwd',
                cap_fi: '0000000000000000',
                cap_fp: '0000000000000000',
                cap_fver: '0',
                dev: 'fc:01',
              },
            ],
            message_type: 'syscall',
            sequence: 8817905,
            result: 'success',
          },
          event: {
            category: 'audit-rule',
            action: 'opened-file',
            original: [
              'type=SYSCALL msg=audit(1553886083.420:8817905): arch=c000003e syscall=257 success=yes exit=12 a0=ffffff9c a1=7fe0f63df220 a2=80000 a3=0 items=1 ppid=1 pid=15990 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auditbeat" exe="/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat" key=(null)',
              'type=CWD msg=audit(1553886083.420:8817905): cwd="/root/go/src/github.com/elastic/beats/x-pack/auditbeat"',
              'type=PATH msg=audit(1553886083.420:8817905): item=0 name="/etc/passwd" inode=3926 dev=fc:01 mode=0100644 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0000000000000000 cap_fi=0000000000000000 cap_fe=0 cap_fver=0',
              'type=PROCTITLE msg=audit(1553886083.420:8817905): proctitle=2F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F617564697462656174002D65002D63002F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F6175',
            ],
            module: 'auditd',
          },
          ecs: {
            version: '1.0.0',
          },
          agent: {
            ephemeral_id: '6d541d59-52d0-4e70-b4d2-2660c0a99ff7',
            hostname: 'zeek-london',
            id: 'cc1f4183-36c6-45c4-b21b-7ce70c3572db',
            version: '8.0.0',
            type: 'auditbeat',
          },
        },
      },
    ],
  },
};
export const mockOptions: RequestDetailsOptions = {
  indexName: 'auditbeat-8.0.0-2019.03.29-000003',
  eventId: 'TUfUymkBCQofM5eXGBYL',
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetNetworkTopNFlowQuery',
    variables: {
      indexName: 'auditbeat-8.0.0-2019.03.29-000003',
      eventId: 'TUfUymkBCQofM5eXGBYL',
    },
    query: `query GetTimelineDetailsQuery($eventId: String!, $indexName: String!) {
        source(id: "default") {
          TimelineDetails(eventId: $eventId, indexName: $indexName) {
            data {
              category
              description
              example
              field
              type
              values
              originalValue
            }
          }
        }
      }`,
  },
};

export const mockResponseMap = {
  'auditbeat-8.0.0-2019.03.29-000003': {
    mappings: {
      _meta: {
        beat: 'auditbeat',
        version: '8.0.0',
      },
      dynamic_templates: [
        {
          'container.labels': {
            path_match: 'container.labels.*',
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword',
            },
          },
        },
        {
          fields: {
            path_match: 'fields.*',
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword',
            },
          },
        },
        {
          'docker.container.labels': {
            path_match: 'docker.container.labels.*',
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword',
            },
          },
        },
        {
          strings_as_keyword: {
            match_mapping_type: 'string',
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      ],
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },
        agent: {
          properties: {
            ephemeral_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            hostname: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        auditd: {
          properties: {
            data: {
              properties: {
                a0: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                a1: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                a2: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                a3: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'a[0-3]': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                acct: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                acl: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                action: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                added: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                addr: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                apparmor: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                arch: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                argc: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                audit_backlog_limit: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                audit_backlog_wait_time: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                audit_enabled: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                audit_failure: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                banners: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                bool: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                bus: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fver: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_pe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_pi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_pp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                capability: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cgroup: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                changed: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cipher: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                class: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cmd: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                compat: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                daddr: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                data: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'default-context': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                dev: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                device: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                dir: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                direction: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                dmac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                dport: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                enforcing: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                entries: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                exit: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fam: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fd: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                feature: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                file: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                flags: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                format: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                fver: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                grantors: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                grp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                hook: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                hostname: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                icmp_type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                igid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'img-ctx': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inif: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ino: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inode: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inode_gid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inode_uid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                invalid_context: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ioctlcmd: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ip: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ipid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'ipx-net': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                item: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                items: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                iuid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                kind: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ksize: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                laddr: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                len: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                list: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                lport: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                mac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                macproto: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                maj: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                major: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                minor: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                mode: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                model: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                msg: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nametype: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nargs: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                net: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-chardev': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-disk': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-enabled': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-fs': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-level': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-log_passwd': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-mem': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-net': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-range': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-rng': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-role': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-seuser': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'new-vcpu': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new_gid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new_lock: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new_pe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new_pi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                new_pp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'nlnk-fam': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'nlnk-grp': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'nlnk-pid': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                oauid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_gid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_uid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ocomm: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                oflag: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-auid': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-chardev': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-disk': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-enabled': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-fs': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-level': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-log_passwd': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-mem': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-net': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-range': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-rng': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-role': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-ses': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-seuser': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'old-vcpu': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_enforcing: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_lock: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_pe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_pi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_pp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_prom: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                old_val: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                op: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                opid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                oses: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                outif: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                parent: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                per: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                perm: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                perm_mask: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                permissive: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                pfs: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                printer: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                prom: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                proto: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                qbytes: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                range: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                rdev: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reason: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                removed: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                res: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                resrc: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                rport: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sauid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                scontext: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'selected-context': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                seperm: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                seperms: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                seqno: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                seresult: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ses: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                seuser: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sig: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sigev_signo: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                smac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                socket: {
                  properties: {
                    addr: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    family: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    port: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    saddr: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                spid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sport: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                state: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subj: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                success: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                syscall: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                table: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tclass: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tcontext: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                terminal: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tty: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                unit: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                uri: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                uuid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                val: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ver: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                virt: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                vm: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'vm-ctx': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                'vm-pid': {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                watch: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            message_type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            paths: {
              properties: {
                cap_fe: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fi: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fp: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                cap_fver: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                dev: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inode: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                item: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                mode: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nametype: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_level: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_role: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                obj_user: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                objtype: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ogid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ouid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                rdev: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            result: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sequence: {
              type: 'long',
            },
            session: {
              type: 'keyword',
              ignore_above: 1024,
            },
            summary: {
              properties: {
                actor: {
                  properties: {
                    primary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    secondary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                how: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                object: {
                  properties: {
                    primary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    secondary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
          },
        },
        client: {
          properties: {
            address: {
              type: 'keyword',
              ignore_above: 1024,
            },
            bytes: {
              type: 'long',
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            packets: {
              type: 'long',
            },
            port: {
              type: 'long',
            },
          },
        },
        cloud: {
          properties: {
            account: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            availability_zone: {
              type: 'keyword',
              ignore_above: 1024,
            },
            instance: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            machine: {
              properties: {
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            project: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            provider: {
              type: 'keyword',
              ignore_above: 1024,
            },
            region: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        container: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            image: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tag: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            labels: {
              type: 'object',
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            runtime: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        destination: {
          properties: {
            address: {
              type: 'keyword',
              ignore_above: 1024,
            },
            bytes: {
              type: 'long',
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            packets: {
              type: 'long',
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            port: {
              type: 'long',
            },
          },
        },
        docker: {
          properties: {
            container: {
              properties: {
                labels: {
                  type: 'object',
                },
              },
            },
          },
        },
        ecs: {
          properties: {
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        error: {
          properties: {
            code: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            message: {
              type: 'text',
              norms: false,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        event: {
          properties: {
            action: {
              type: 'keyword',
              ignore_above: 1024,
            },
            category: {
              type: 'keyword',
              ignore_above: 1024,
            },
            created: {
              type: 'date',
            },
            dataset: {
              type: 'keyword',
              ignore_above: 1024,
            },
            duration: {
              type: 'long',
            },
            end: {
              type: 'date',
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            kind: {
              type: 'keyword',
              ignore_above: 1024,
            },
            module: {
              type: 'keyword',
              ignore_above: 1024,
            },
            origin: {
              type: 'keyword',
              ignore_above: 1024,
            },
            original: {
              type: 'keyword',
              index: false,
              doc_values: false,
              ignore_above: 1024,
            },
            outcome: {
              type: 'keyword',
              ignore_above: 1024,
            },
            risk_score: {
              type: 'float',
            },
            risk_score_norm: {
              type: 'float',
            },
            severity: {
              type: 'long',
            },
            start: {
              type: 'date',
            },
            timezone: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        fields: {
          type: 'object',
        },
        file: {
          properties: {
            ctime: {
              type: 'date',
            },
            device: {
              type: 'keyword',
              ignore_above: 1024,
            },
            extension: {
              type: 'keyword',
              ignore_above: 1024,
            },
            gid: {
              type: 'keyword',
              ignore_above: 1024,
            },
            group: {
              type: 'keyword',
              ignore_above: 1024,
            },
            inode: {
              type: 'keyword',
              ignore_above: 1024,
            },
            mode: {
              type: 'keyword',
              ignore_above: 1024,
            },
            mtime: {
              type: 'date',
            },
            origin: {
              type: 'keyword',
              fields: {
                raw: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
              ignore_above: 1024,
            },
            owner: {
              type: 'keyword',
              ignore_above: 1024,
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            selinux: {
              properties: {
                domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                level: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                role: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            setgid: {
              type: 'boolean',
            },
            setuid: {
              type: 'boolean',
            },
            size: {
              type: 'long',
            },
            target_path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            uid: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        geoip: {
          properties: {
            city_name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            continent_name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            country_iso_code: {
              type: 'keyword',
              ignore_above: 1024,
            },
            location: {
              type: 'geo_point',
            },
            region_name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        group: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        hash: {
          properties: {
            blake2b_256: {
              type: 'keyword',
              ignore_above: 1024,
            },
            blake2b_384: {
              type: 'keyword',
              ignore_above: 1024,
            },
            blake2b_512: {
              type: 'keyword',
              ignore_above: 1024,
            },
            md5: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha1: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha224: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha256: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha384: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha3_224: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha3_256: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha3_384: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha3_512: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha512: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha512_224: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sha512_256: {
              type: 'keyword',
              ignore_above: 1024,
            },
            xxh64: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        host: {
          properties: {
            architecture: {
              type: 'keyword',
              ignore_above: 1024,
            },
            containerized: {
              type: 'boolean',
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hostname: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            os: {
              properties: {
                codename: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        http: {
          properties: {
            request: {
              properties: {
                body: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    content: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                bytes: {
                  type: 'long',
                },
                method: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                referrer: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            response: {
              properties: {
                body: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    content: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                bytes: {
                  type: 'long',
                },
                status_code: {
                  type: 'long',
                },
              },
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        kubernetes: {
          properties: {
            annotations: {
              type: 'object',
            },
            container: {
              properties: {
                image: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            labels: {
              type: 'object',
            },
            namespace: {
              type: 'keyword',
              ignore_above: 1024,
            },
            node: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            pod: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                uid: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        labels: {
          type: 'object',
        },
        log: {
          properties: {
            level: {
              type: 'keyword',
              ignore_above: 1024,
            },
            original: {
              type: 'keyword',
              index: false,
              doc_values: false,
              ignore_above: 1024,
            },
          },
        },
        message: {
          type: 'text',
          norms: false,
        },
        network: {
          properties: {
            application: {
              type: 'keyword',
              ignore_above: 1024,
            },
            bytes: {
              type: 'long',
            },
            community_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            direction: {
              type: 'keyword',
              ignore_above: 1024,
            },
            forwarded_ip: {
              type: 'ip',
            },
            iana_number: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            packets: {
              type: 'long',
            },
            protocol: {
              type: 'keyword',
              ignore_above: 1024,
            },
            transport: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        observer: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hostname: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            os: {
              properties: {
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            serial_number: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            vendor: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        organization: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        os: {
          properties: {
            family: {
              type: 'keyword',
              ignore_above: 1024,
            },
            full: {
              type: 'keyword',
              ignore_above: 1024,
            },
            kernel: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            platform: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        process: {
          properties: {
            args: {
              type: 'keyword',
              ignore_above: 1024,
            },
            entity_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            executable: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            pid: {
              type: 'long',
            },
            ppid: {
              type: 'long',
            },
            start: {
              type: 'date',
            },
            thread: {
              properties: {
                id: {
                  type: 'long',
                },
              },
            },
            title: {
              type: 'keyword',
              ignore_above: 1024,
            },
            working_directory: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        related: {
          properties: {
            ip: {
              type: 'ip',
            },
          },
        },
        server: {
          properties: {
            address: {
              type: 'keyword',
              ignore_above: 1024,
            },
            bytes: {
              type: 'long',
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            packets: {
              type: 'long',
            },
            port: {
              type: 'long',
            },
          },
        },
        service: {
          properties: {
            ephemeral_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            state: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        socket: {
          properties: {
            entity_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        source: {
          properties: {
            address: {
              type: 'keyword',
              ignore_above: 1024,
            },
            bytes: {
              type: 'long',
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            packets: {
              type: 'long',
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            port: {
              type: 'long',
            },
          },
        },
        system: {
          properties: {
            audit: {
              properties: {
                host: {
                  properties: {
                    architecture: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    boottime: {
                      type: 'date',
                    },
                    containerized: {
                      type: 'boolean',
                    },
                    hostname: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    ip: {
                      type: 'ip',
                    },
                    mac: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    os: {
                      properties: {
                        family: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        kernel: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        platform: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    timezone: {
                      properties: {
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        offset: {
                          properties: {
                            sec: {
                              type: 'long',
                            },
                          },
                        },
                      },
                    },
                    uptime: {
                      type: 'long',
                    },
                  },
                },
                package: {
                  properties: {
                    arch: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    installtime: {
                      type: 'date',
                    },
                    license: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    release: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    size: {
                      type: 'long',
                    },
                    summary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    url: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                user: {
                  properties: {
                    dir: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    gid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    group: {
                      properties: {
                        gid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    password: {
                      properties: {
                        last_changed: {
                          type: 'date',
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    shell: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    uid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    user_information: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
          },
        },
        tags: {
          type: 'keyword',
          ignore_above: 1024,
        },
        url: {
          properties: {
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            fragment: {
              type: 'keyword',
              ignore_above: 1024,
            },
            full: {
              type: 'keyword',
              ignore_above: 1024,
            },
            original: {
              type: 'keyword',
              ignore_above: 1024,
            },
            password: {
              type: 'keyword',
              ignore_above: 1024,
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            port: {
              type: 'long',
            },
            query: {
              type: 'keyword',
              ignore_above: 1024,
            },
            scheme: {
              type: 'keyword',
              ignore_above: 1024,
            },
            username: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        user: {
          properties: {
            audit: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            effective: {
              properties: {
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            email: {
              type: 'keyword',
              ignore_above: 1024,
            },
            entity_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            filesystem: {
              properties: {
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            full_name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name_map: {
              type: 'object',
            },
            ogid: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ouid: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            saved: {
              properties: {
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            selinux: {
              properties: {
                category: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                level: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                role: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            terminal: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        user_agent: {
          properties: {
            device: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            original: {
              type: 'keyword',
              ignore_above: 1024,
            },
            os: {
              properties: {
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
      },
    },
  },
};

export const mockTimelineDetailsResult = {
  data: [
    {
      category: '_id',
      field: '_id',
      values: 'TUfUymkBCQofM5eXGBYL',
      originalValue: 'TUfUymkBCQofM5eXGBYL',
      description: 'Each document has an _id that uniquely identifies it',
      example: 'Y-6TfmcB0WOhS6qyMv3s',
      footnote: '',
      group: 1,
      level: 'core',
      name: '_id',
      required: true,
      type: 'keyword',
    },
    {
      category: '_index',
      field: '_index',
      values: 'auditbeat-8.0.0-2019.03.29-000003',
      originalValue: 'auditbeat-8.0.0-2019.03.29-000003',
      description:
        'An index is like a ‘database’ in a relational database. It has a mapping which defines multiple types. An index is a logical namespace which maps to one or more primary shards and can have zero or more replica shards.',
      example: 'auditbeat-8.0.0-2019.02.19-000001',
      footnote: '',
      group: 1,
      level: 'core',
      name: '_index',
      required: true,
      type: 'keyword',
    },
    {
      category: '_type',
      field: '_type',
      values: '_doc',
      originalValue: '_doc',
      type: 'keyword',
    },
    {
      category: '_score',
      field: '_score',
      values: 1,
      originalValue: 1,
      type: 'long',
    },
    {
      category: '@timestamp',
      field: '@timestamp',
      values: '2019-03-29T19:01:23.420Z',
      originalValue: '2019-03-29T19:01:23.420Z',
      description:
        'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
      example: '2016-05-23T08:05:34.853Z',
      name: '@timestamp',
      type: 'date',
    },
    {
      category: 'agent',
      field: 'agent.ephemeral_id',
      values: '6d541d59-52d0-4e70-b4d2-2660c0a99ff7',
      originalValue: '6d541d59-52d0-4e70-b4d2-2660c0a99ff7',
      description:
        'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
      example: '8a4f500f',
      name: 'ephemeral_id',
      type: 'keyword',
    },
    {
      category: 'agent',
      field: 'agent.hostname',
      values: 'zeek-london',
      originalValue: 'zeek-london',
      type: 'keyword',
    },
    {
      category: 'agent',
      field: 'agent.id',
      values: 'cc1f4183-36c6-45c4-b21b-7ce70c3572db',
      originalValue: 'cc1f4183-36c6-45c4-b21b-7ce70c3572db',
      description:
        'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
      example: '8a4f500d',
      name: 'id',
      type: 'keyword',
    },
    {
      category: 'agent',
      field: 'agent.type',
      values: 'auditbeat',
      originalValue: 'auditbeat',
      description:
        'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
      example: 'filebeat',
      name: 'type',
      type: 'keyword',
    },
    {
      category: 'agent',
      field: 'agent.version',
      values: '8.0.0',
      originalValue: '8.0.0',
      description: 'Version of the agent.',
      example: '6.0.0-rc2',
      name: 'version',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.a0',
      values: 'ffffff9c',
      originalValue: 'ffffff9c',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.a1',
      values: '7fe0f63df220',
      originalValue: '7fe0f63df220',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.a2',
      values: '80000',
      originalValue: '80000',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.a3',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.arch',
      values: 'x86_64',
      originalValue: 'x86_64',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.exit',
      values: '12',
      originalValue: '12',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.syscall',
      values: 'openat',
      originalValue: 'openat',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.data.tty',
      values: '(none)',
      originalValue: '(none)',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.message_type',
      values: 'syscall',
      originalValue: 'syscall',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.result',
      values: 'success',
      originalValue: 'success',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.sequence',
      values: 8817905,
      originalValue: 8817905,
      type: 'long',
    },
    {
      category: 'auditd',
      field: 'auditd.session',
      values: 'unset',
      originalValue: 'unset',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.summary.actor.primary',
      values: 'unset',
      originalValue: 'unset',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.summary.actor.secondary',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.summary.how',
      values: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
      originalValue: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.summary.object.primary',
      values: '/etc/passwd',
      originalValue: '/etc/passwd',
      type: 'keyword',
    },
    {
      category: 'auditd',
      field: 'auditd.summary.object.type',
      values: 'file',
      originalValue: 'file',
      type: 'keyword',
    },
    {
      category: 'cloud',
      field: 'cloud.instance.id',
      values: '136398786',
      originalValue: '136398786',
      description: 'Instance ID of the host machine.',
      example: 'i-1234567890abcdef0',
      name: 'instance.id',
      type: 'keyword',
    },
    {
      category: 'cloud',
      field: 'cloud.provider',
      values: 'digitalocean',
      originalValue: 'digitalocean',
      description: 'Name of the cloud provider. Example values are ec2, gce, or digitalocean.',
      example: 'ec2',
      name: 'provider',
      type: 'keyword',
    },
    {
      category: 'cloud',
      field: 'cloud.region',
      values: 'lon1',
      originalValue: 'lon1',
      description: 'Region in which this host is running.',
      example: 'us-east-1',
      name: 'region',
      type: 'keyword',
    },
    {
      category: 'ecs',
      field: 'ecs.version',
      values: '1.0.0',
      originalValue: '1.0.0',
      description:
        'ECS version this event conforms to. `ecs.version` is a required field and must exist in all events. When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events. The current version is 1.0.0-beta2 .',
      example: '1.0.0-beta2',
      name: 'version',
      type: 'keyword',
    },
    {
      category: 'event',
      field: 'event.action',
      values: 'opened-file',
      originalValue: 'opened-file',
      description:
        'The action captured by the event. This describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
      example: 'user-password-change',
      name: 'action',
      type: 'keyword',
    },
    {
      category: 'event',
      field: 'event.category',
      values: 'audit-rule',
      originalValue: 'audit-rule',
      description:
        'Event category. This contains high-level information about the contents of the event. It is more generic than `event.action`, in the sense that typically a category contains multiple actions. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
      example: 'user-management',
      name: 'category',
      type: 'keyword',
    },
    {
      category: 'event',
      field: 'event.module',
      values: 'auditd',
      originalValue: 'auditd',
      description:
        'Name of the module this data is coming from. This information is coming from the modules used in Beats or Logstash.',
      example: 'mysql',
      name: 'module',
      type: 'keyword',
    },
    {
      category: 'event',
      field: 'event.original',
      values: [
        'type=SYSCALL msg=audit(1553886083.420:8817905): arch=c000003e syscall=257 success=yes exit=12 a0=ffffff9c a1=7fe0f63df220 a2=80000 a3=0 items=1 ppid=1 pid=15990 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auditbeat" exe="/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat" key=(null)',
        'type=CWD msg=audit(1553886083.420:8817905): cwd="/root/go/src/github.com/elastic/beats/x-pack/auditbeat"',
        'type=PATH msg=audit(1553886083.420:8817905): item=0 name="/etc/passwd" inode=3926 dev=fc:01 mode=0100644 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0000000000000000 cap_fi=0000000000000000 cap_fe=0 cap_fver=0',
        'type=PROCTITLE msg=audit(1553886083.420:8817905): proctitle=2F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F617564697462656174002D65002D63002F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F6175',
      ],
      originalValue: [
        'type=SYSCALL msg=audit(1553886083.420:8817905): arch=c000003e syscall=257 success=yes exit=12 a0=ffffff9c a1=7fe0f63df220 a2=80000 a3=0 items=1 ppid=1 pid=15990 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auditbeat" exe="/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat" key=(null)',
        'type=CWD msg=audit(1553886083.420:8817905): cwd="/root/go/src/github.com/elastic/beats/x-pack/auditbeat"',
        'type=PATH msg=audit(1553886083.420:8817905): item=0 name="/etc/passwd" inode=3926 dev=fc:01 mode=0100644 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL cap_fp=0000000000000000 cap_fi=0000000000000000 cap_fe=0 cap_fver=0',
        'type=PROCTITLE msg=audit(1553886083.420:8817905): proctitle=2F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F617564697462656174002D65002D63002F726F6F742F676F2F7372632F6769746875622E636F6D2F656C61737469632F62656174732F782D7061636B2F6175646974626561742F6175',
      ],
      description:
        'Raw text message of entire event. Used to demonstrate log integrity. This field is not indexed and doc_values are disabled. It cannot be searched, but it can be retrieved from `_source`.',
      example:
        'Sep 19 08:26:10 host CEF:0&#124;Security&#124; threatmanager&#124;1.0&#124;100&#124; worm successfully stopped&#124;10&#124;src=10.0.0.1 dst=2.1.2.2spt=1232',
      name: 'original',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.device',
      values: '00:00',
      originalValue: '00:00',
      description: 'Device that is the source of the file.',
      name: 'device',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.gid',
      values: '0',
      originalValue: '0',
      description: 'Primary group ID (GID) of the file.',
      name: 'gid',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.group',
      values: 'root',
      originalValue: 'root',
      description: 'Primary group name of the file.',
      name: 'group',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.inode',
      values: '3926',
      originalValue: '3926',
      description: 'Inode representing the file in the filesystem.',
      name: 'inode',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.mode',
      values: '0644',
      originalValue: '0644',
      description: 'Mode of the file in octal representation.',
      example: 416,
      name: 'mode',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.owner',
      values: 'root',
      originalValue: 'root',
      description: "File owner's username.",
      name: 'owner',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.path',
      values: '/etc/passwd',
      originalValue: '/etc/passwd',
      description: 'Path to the file.',
      name: 'path',
      type: 'keyword',
    },
    {
      category: 'file',
      field: 'file.uid',
      values: '0',
      originalValue: '0',
      description: 'The user ID (UID) or security identifier (SID) of the file owner.',
      name: 'uid',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.architecture',
      values: 'x86_64',
      originalValue: 'x86_64',
      description: 'Operating system architecture.',
      example: 'x86_64',
      name: 'architecture',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.hostname',
      values: 'zeek-london',
      originalValue: 'zeek-london',
      description:
        'Hostname of the host. It normally contains what the `hostname` command returns on the host machine.',
      name: 'hostname',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.id',
      values: '7c21f5ed03b04d0299569d221fe18bbc',
      originalValue: '7c21f5ed03b04d0299569d221fe18bbc',
      description:
        'Unique host id. As hostname is not always unique, use values that are meaningful in your environment. Example: The current usage of `beat.name`.',
      name: 'id',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.ip',
      values: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      originalValue: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      description: 'Host ip address.',
      name: 'ip',
      type: 'ip',
    },
    {
      category: 'host',
      field: 'host.mac',
      values: ['42:66:42:19:b3:b9'],
      originalValue: ['42:66:42:19:b3:b9'],
      description: 'Host mac address.',
      name: 'mac',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.name',
      values: 'zeek-london',
      originalValue: 'zeek-london',
      description:
        'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
      name: 'name',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.codename',
      values: 'bionic',
      originalValue: 'bionic',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.family',
      values: 'debian',
      originalValue: 'debian',
      description: 'OS family (such as redhat, debian, freebsd, windows).',
      example: 'debian',
      name: 'family',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.kernel',
      values: '4.15.0-45-generic',
      originalValue: '4.15.0-45-generic',
      description: 'Operating system kernel version as a raw string.',
      example: '4.4.0-112-generic',
      name: 'kernel',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.name',
      values: 'Ubuntu',
      originalValue: 'Ubuntu',
      description: 'Operating system name, without the version.',
      example: 'Mac OS X',
      name: 'name',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.platform',
      values: 'ubuntu',
      originalValue: 'ubuntu',
      description: 'Operating system platform (such centos, ubuntu, windows).',
      example: 'darwin',
      name: 'platform',
      type: 'keyword',
    },
    {
      category: 'host',
      field: 'host.os.version',
      values: '18.04.2 LTS (Bionic Beaver)',
      originalValue: '18.04.2 LTS (Bionic Beaver)',
      description: 'Operating system version as a raw string.',
      example: '10.14.1',
      name: 'version',
      type: 'keyword',
    },
    {
      category: 'process',
      field: 'process.executable',
      values: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
      originalValue: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat',
      type: 'keyword',
    },
    {
      category: 'process',
      field: 'process.name',
      values: 'auditbeat',
      originalValue: 'auditbeat',
      type: 'keyword',
    },
    {
      category: 'process',
      field: 'process.pid',
      values: 15990,
      originalValue: 15990,
      type: 'long',
    },
    {
      category: 'process',
      field: 'process.ppid',
      values: 1,
      originalValue: 1,
      type: 'long',
    },
    {
      category: 'process',
      field: 'process.title',
      values:
        '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat -e -c /root/go/src/github.com/elastic/beats/x-pack/auditbeat/au',
      originalValue:
        '/root/go/src/github.com/elastic/beats/x-pack/auditbeat/auditbeat -e -c /root/go/src/github.com/elastic/beats/x-pack/auditbeat/au',
      type: 'keyword',
    },
    {
      category: 'process',
      field: 'process.working_directory',
      values: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat',
      originalValue: '/root/go/src/github.com/elastic/beats/x-pack/auditbeat',
      type: 'keyword',
    },
    {
      category: 'service',
      field: 'service.type',
      values: 'auditd',
      originalValue: 'auditd',
      description:
        'The type of the service data is collected from. The type can be used to group and correlate logs and metrics from one service type. Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
      example: 'elasticsearch',
      name: 'type',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.audit.id',
      values: 'unset',
      originalValue: 'unset',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.effective.group.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.effective.group.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.effective.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.effective.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.filesystem.group.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.filesystem.group.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.filesystem.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.filesystem.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.group.id',
      values: '0',
      originalValue: '0',
      description: 'Unique identifier for the group on the system/platform.',
      name: 'id',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.group.name',
      values: 'root',
      originalValue: 'root',
      description: 'Name of the group.',
      name: 'name',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.id',
      values: '0',
      originalValue: '0',
      description: 'One or multiple unique identifiers of the user.',
      name: 'id',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.name',
      values: 'root',
      originalValue: 'root',
      description: 'Short name or login of the user.',
      example: 'albert',
      name: 'name',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.saved.group.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.saved.group.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.saved.id',
      values: '0',
      originalValue: '0',
      type: 'keyword',
    },
    {
      category: 'user',
      field: 'user.saved.name',
      values: 'root',
      originalValue: 'root',
      type: 'keyword',
    },
  ],
};
