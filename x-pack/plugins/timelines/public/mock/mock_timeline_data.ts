/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '../../common/ecs';
import { TimelineItem, Direction } from '../../common/search_strategy';
import type { TGridModel } from '../store/t_grid/model';

export const mockTimelineData: TimelineItem[] = [
  {
    _id: '1',
    data: [
      { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'event.action', value: ['Action'] },
      { field: 'host.name', value: ['apache'] },
      { field: 'source.ip', value: ['192.168.0.1'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['john.dee'] },
    ],
    ecs: {
      _id: '1',
      timestamp: '2018-11-05T19:03:25.937Z',
      host: { name: ['apache'], ip: ['192.168.0.1'] },
      event: {
        id: ['1'],
        action: ['Action'],
        category: ['Access'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.1'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['1'], name: ['john.dee'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '3',
    data: [
      { field: '@timestamp', value: ['2018-11-07T19:03:25.937Z'] },
      { field: 'event.severity', value: ['1'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['nginx'] },
      { field: 'source.ip', value: ['192.168.0.3'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['evan.davis'] },
    ],
    ecs: {
      _id: '3',
      timestamp: '2018-11-07T19:03:25.937Z',
      host: { name: ['nginx'], ip: ['192.168.0.1'] },
      event: {
        id: ['3'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [1],
      },
      source: { ip: ['192.168.0.3'], port: [443] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['3'], name: ['evan.davis'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '4',
    data: [
      { field: '@timestamp', value: ['2018-11-08T19:03:25.937Z'] },
      { field: 'event.severity', value: ['1'] },
      { field: 'event.category', value: ['Attempted Administrator Privilege Gain'] },
      { field: 'host.name', value: ['suricata'] },
      { field: 'source.ip', value: ['192.168.0.3'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jenny.jones'] },
    ],
    ecs: {
      _id: '4',
      timestamp: '2018-11-08T19:03:25.937Z',
      host: { name: ['suricata'], ip: ['192.168.0.1'] },
      event: {
        id: ['4'],
        category: ['Attempted Administrator Privilege Gain'],
        type: ['Alert'],
        module: ['suricata'],
        severity: [1],
      },
      source: { ip: ['192.168.0.3'], port: [53] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      suricata: {
        eve: {
          flow_id: [4],
          proto: [''],
          alert: {
            signature: [
              'ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)',
            ],
            signature_id: [4],
          },
        },
      },
      user: { id: ['4'], name: ['jenny.jones'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '5',
    data: [
      { field: '@timestamp', value: ['2018-11-09T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.3'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['becky.davis'] },
    ],
    ecs: {
      _id: '5',
      timestamp: '2018-11-09T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['5'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.3'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['5'], name: ['becky.davis'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '6',
    data: [
      { field: '@timestamp', value: ['2018-11-10T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['braden.davis'] },
      { field: 'source.ip', value: ['192.168.0.6'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
    ],
    ecs: {
      _id: '6',
      timestamp: '2018-11-10T19:03:25.937Z',
      host: { name: ['braden.davis'], ip: ['192.168.0.1'] },
      event: {
        id: ['6'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.6'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '8',
    data: [
      { field: '@timestamp', value: ['2018-11-12T19:03:25.937Z'] },
      { field: 'event.severity', value: ['2'] },
      { field: 'event.category', value: ['Web Application Attack'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.8'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '8',
      timestamp: '2018-11-12T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['8'],
        category: ['Web Application Attack'],
        type: ['Alert'],
        module: ['suricata'],
        severity: [2],
      },
      suricata: {
        eve: {
          flow_id: [8],
          proto: [''],
          alert: {
            signature: ['ET WEB_SERVER Possible CVE-2014-6271 Attempt in HTTP Cookie'],
            signature_id: [8],
          },
        },
      },
      source: { ip: ['192.168.0.8'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['8'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '7',
    data: [
      { field: '@timestamp', value: ['2018-11-11T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.7'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '7',
      timestamp: '2018-11-11T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['7'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['apache'],
        severity: [3],
      },
      source: { ip: ['192.168.0.7'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['7'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '9',
    data: [
      { field: '@timestamp', value: ['2018-11-13T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.9'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '9',
      timestamp: '2018-11-13T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['9'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.9'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['9'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '10',
    data: [
      { field: '@timestamp', value: ['2018-11-14T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.10'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '10',
      timestamp: '2018-11-14T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['10'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.10'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['10'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '11',
    data: [
      { field: '@timestamp', value: ['2018-11-15T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.11'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '11',
      timestamp: '2018-11-15T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['11'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.11'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['11'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '12',
    data: [
      { field: '@timestamp', value: ['2018-11-16T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.12'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['jone.doe'] },
    ],
    ecs: {
      _id: '12',
      timestamp: '2018-11-16T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['12'],
        category: ['Access'],
        type: ['HTTP Request'],
        module: ['nginx'],
        severity: [3],
      },
      source: { ip: ['192.168.0.12'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['12'], name: ['jone.doe'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '2',
    data: [
      { field: '@timestamp', value: ['2018-11-06T19:03:25.937Z'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Authentication'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.2'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['joe.bob'] },
    ],
    ecs: {
      _id: '2',
      timestamp: '2018-11-06T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['2'],
        category: ['Authentication'],
        type: ['Authentication Success'],
        module: ['authlog'],
        severity: [3],
      },
      source: { ip: ['192.168.0.2'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['1'], name: ['joe.bob'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '13',
    data: [
      { field: '@timestamp', value: ['2018-13-12T19:03:25.937Z'] },
      { field: 'event.severity', value: ['1'] },
      { field: 'event.category', value: ['Web Application Attack'] },
      { field: 'host.name', value: ['joe.computer'] },
      { field: 'source.ip', value: ['192.168.0.8'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
    ],
    ecs: {
      _id: '13',
      timestamp: '2018-13-12T19:03:25.937Z',
      host: { name: ['joe.computer'], ip: ['192.168.0.1'] },
      event: {
        id: ['13'],
        category: ['Web Application Attack'],
        type: ['Alert'],
        module: ['suricata'],
        severity: [1],
      },
      suricata: {
        eve: {
          flow_id: [13],
          proto: [''],
          alert: {
            signature: ['ET WEB_SERVER Possible Attempt in HTTP Cookie'],
            signature_id: [13],
          },
        },
      },
      source: { ip: ['192.168.0.8'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '14',
    data: [
      { field: '@timestamp', value: ['2019-03-07T05:06:51.000Z'] },
      { field: 'host.name', value: ['zeek-franfurt'] },
      { field: 'source.ip', value: ['192.168.26.101'] },
      { field: 'destination.ip', value: ['192.168.238.205'] },
    ],
    ecs: {
      _id: '14',
      timestamp: '2019-03-07T05:06:51.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.connection'],
      },
      host: {
        id: ['37c81253e0fc4c46839c19b981be5177'],
        name: ['zeek-franfurt'],
        ip: ['207.154.238.205', '10.19.0.5', 'fe80::d82b:9aff:fe0d:1e12'],
      },
      source: { ip: ['185.176.26.101'], port: [44059] },
      destination: { ip: ['207.154.238.205'], port: [11568] },
      geo: { region_name: ['New York'], country_iso_code: ['US'] },
      network: { transport: ['tcp'] },
      zeek: {
        session_id: ['C8DRTq362Fios6hw16'],
        connection: {
          local_resp: [false],
          local_orig: [false],
          missed_bytes: [0],
          state: ['REJ'],
          history: ['Sr'],
        },
      },
    },
  },
  {
    _id: '15',
    data: [
      { field: '@timestamp', value: ['2019-03-07T00:51:28.000Z'] },
      { field: 'host.name', value: ['suricata-zeek-singapore'] },
      { field: 'source.ip', value: ['192.168.35.240'] },
      { field: 'destination.ip', value: ['192.168.67.3'] },
    ],
    ecs: {
      _id: '15',
      timestamp: '2019-03-07T00:51:28.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.dns'],
      },
      host: {
        id: ['af3fddf15f1d47979ce817ba0df10c6e'],
        name: ['suricata-zeek-singapore'],
        ip: ['206.189.35.240', '10.15.0.5', 'fe80::98c7:eff:fe29:4455'],
      },
      source: { ip: ['206.189.35.240'], port: [57475] },
      destination: { ip: ['67.207.67.3'], port: [53] },
      geo: { region_name: ['New York'], country_iso_code: ['US'] },
      network: { transport: ['udp'] },
      zeek: {
        session_id: ['CyIrMA1L1JtLqdIuol'],
        dns: {
          AA: [false],
          RD: [false],
          trans_id: [65252],
          RA: [false],
          TC: [false],
        },
      },
    },
  },
  {
    _id: '16',
    data: [
      { field: '@timestamp', value: ['2019-03-05T07:00:20.000Z'] },
      { field: 'host.name', value: ['suricata-zeek-singapore'] },
      { field: 'source.ip', value: ['192.168.35.240'] },
      { field: 'destination.ip', value: ['192.168.164.26'] },
    ],
    ecs: {
      _id: '16',
      timestamp: '2019-03-05T07:00:20.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.http'],
      },
      host: {
        id: ['af3fddf15f1d47979ce817ba0df10c6e'],
        name: ['suricata-zeek-singapore'],
        ip: ['206.189.35.240', '10.15.0.5', 'fe80::98c7:eff:fe29:4455'],
      },
      source: { ip: ['206.189.35.240'], port: [36220] },
      destination: { ip: ['192.241.164.26'], port: [80] },
      geo: { region_name: ['New York'], country_iso_code: ['US'] },
      http: {
        version: ['1.1'],
        request: { body: { bytes: [0] } },
        response: { status_code: [302], body: { bytes: [154] } },
      },
      zeek: {
        session_id: ['CZLkpC22NquQJOpkwe'],

        http: {
          resp_mime_types: ['text/html'],
          trans_depth: ['3'],
          status_msg: ['Moved Temporarily'],
          resp_fuids: ['FzeujEPP7GTHmYPsc'],
          tags: [],
        },
      },
    },
  },
  {
    _id: '17',
    data: [
      { field: '@timestamp', value: ['2019-02-28T22:36:28.000Z'] },
      { field: 'host.name', value: ['zeek-franfurt'] },
      { field: 'source.ip', value: ['192.168.77.171'] },
    ],
    ecs: {
      _id: '17',
      timestamp: '2019-02-28T22:36:28.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.notice'],
      },
      host: {
        id: ['37c81253e0fc4c46839c19b981be5177'],
        name: ['zeek-franfurt'],
        ip: ['207.154.238.205', '10.19.0.5', 'fe80::d82b:9aff:fe0d:1e12'],
      },
      source: { ip: ['8.42.77.171'] },
      zeek: {
        notice: {
          suppress_for: [3600],
          msg: ['8.42.77.171 scanned at least 15 unique ports of host 207.154.238.205 in 0m0s'],
          note: ['Scan::Port_Scan'],
          sub: ['remote'],
          dst: ['207.154.238.205'],
          dropped: [false],
          peer_descr: ['bro'],
        },
      },
    },
  },
  {
    _id: '18',
    data: [
      { field: '@timestamp', value: ['2019-02-22T21:12:13.000Z'] },
      { field: 'host.name', value: ['zeek-sensor-amsterdam'] },
      { field: 'source.ip', value: ['192.168.66.184'] },
      { field: 'destination.ip', value: ['192.168.95.15'] },
    ],
    ecs: {
      _id: '18',
      timestamp: '2019-02-22T21:12:13.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.ssl'],
      },
      host: { id: ['2ce8b1e7d69e4a1d9c6bcddc473da9d9'], name: ['zeek-sensor-amsterdam'] },
      source: { ip: ['188.166.66.184'], port: [34514] },
      destination: { ip: ['91.189.95.15'], port: [443] },
      geo: { region_name: ['England'], country_iso_code: ['GB'] },
      zeek: {
        session_id: ['CmTxzt2OVXZLkGDaRe'],
        ssl: {
          cipher: ['TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256'],
          established: [false],
          resumed: [false],
          version: ['TLSv12'],
        },
      },
    },
  },
  {
    _id: '19',
    data: [
      { field: '@timestamp', value: ['2019-03-03T04:26:38.000Z'] },
      { field: 'host.name', value: ['suricata-zeek-singapore'] },
    ],
    ecs: {
      _id: '19',
      timestamp: '2019-03-03T04:26:38.000Z',
      event: {
        module: ['zeek'],
        dataset: ['zeek.files'],
      },
      host: {
        id: ['af3fddf15f1d47979ce817ba0df10c6e'],
        name: ['suricata-zeek-singapore'],
        ip: ['206.189.35.240', '10.15.0.5', 'fe80::98c7:eff:fe29:4455'],
      },
      zeek: {
        session_id: ['Cu0n232QMyvNtzb75j'],
        files: {
          session_ids: ['Cu0n232QMyvNtzb75j'],
          timedout: [false],
          local_orig: [false],
          tx_host: ['5.101.111.50'],
          source: ['HTTP'],
          is_orig: [false],
          overflow_bytes: [0],
          sha1: ['fa5195a5dfacc9d1c68d43600f0e0262cad14dde'],
          duration: [0],
          depth: [0],
          analyzers: ['MD5', 'SHA1'],
          mime_type: ['text/plain'],
          rx_host: ['206.189.35.240'],
          total_bytes: [88722],
          fuid: ['FePz1uVEVCZ3I0FQi'],
          seen_bytes: [1198],
          missing_bytes: [0],
          md5: ['f7653f1951693021daa9e6be61226e32'],
        },
      },
    },
  },
  {
    _id: '20',
    data: [
      { field: '@timestamp', value: ['2019-03-13T05:42:11.815Z'] },
      { field: 'event.category', value: ['audit-rule'] },
      { field: 'host.name', value: ['zeek-sanfran'] },
    ],
    ecs: {
      _id: '20',
      timestamp: '2019-03-13T05:42:11.815Z',
      event: {
        action: ['executed'],
        module: ['auditd'],
        category: ['audit-rule'],
      },
      host: {
        id: ['f896741c3b3b44bdb8e351a4ab6d2d7c'],
        name: ['zeek-sanfran'],
        ip: ['134.209.63.134', '10.46.0.5', 'fe80::a0d9:16ff:fecf:e70b'],
      },
      user: { name: ['alice'] },
      process: {
        pid: [5402],
        name: ['gpgconf'],
        ppid: [5401],
        args: ['gpgconf', '--list-dirs', 'agent-socket'],
        executable: ['/usr/bin/gpgconf'],
        title: ['gpgconf --list-dirs agent-socket'],
        working_directory: ['/'],
      },
    },
  },
  {
    _id: '21',
    data: [
      { field: '@timestamp', value: ['2019-03-14T22:30:25.527Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'source.ip', value: ['192.168.77.171'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '21',
      timestamp: '2019-03-14T22:30:25.527Z',
      event: {
        action: ['logged-in'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['14'],
        data: { terminal: ['/dev/pts/0'], op: ['login'] },
        summary: {
          actor: { primary: ['alice'], secondary: ['alice'] },
          object: { primary: ['/dev/pts/0'], secondary: ['8.42.77.171'], type: ['user-session'] },
          how: ['/usr/sbin/sshd'],
        },
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },
      source: { ip: ['8.42.77.171'] },
      user: { name: ['root'] },
      process: {
        pid: [17471],
        executable: ['/usr/sbin/sshd'],
      },
    },
  },
  {
    _id: '22',
    data: [
      { field: '@timestamp', value: ['2019-03-13T03:35:21.614Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['suricata-bangalore'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '22',
      timestamp: '2019-03-13T03:35:21.614Z',
      event: {
        action: ['disposed-credentials'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['340'],
        data: { acct: ['alice'], terminal: ['ssh'], op: ['PAM:setcred'] },
        summary: {
          actor: { primary: ['alice'], secondary: ['alice'] },
          object: { primary: ['ssh'], secondary: ['8.42.77.171'], type: ['user-session'] },
          how: ['/usr/sbin/sshd'],
        },
      },
      host: {
        id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
        name: ['suricata-bangalore'],
        ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
      },
      user: { name: ['root'] },
      process: {
        pid: [21202],
        executable: ['/usr/sbin/sshd'],
      },
    },
  },
  {
    _id: '23',
    data: [
      { field: '@timestamp', value: ['2019-03-13T03:35:21.614Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['suricata-bangalore'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '23',
      timestamp: '2019-03-13T03:35:21.614Z',
      event: {
        action: ['ended-session'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['340'],
        data: { acct: ['alice'], terminal: ['ssh'], op: ['PAM:session_close'] },
        summary: {
          actor: { primary: ['alice'], secondary: ['alice'] },
          object: { primary: ['ssh'], secondary: ['8.42.77.171'], type: ['user-session'] },
          how: ['/usr/sbin/sshd'],
        },
      },
      host: {
        id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
        name: ['suricata-bangalore'],
        ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
      },
      user: { name: ['root'] },
      process: {
        pid: [21202],
        executable: ['/usr/sbin/sshd'],
      },
    },
  },
  {
    _id: '24',
    data: [
      { field: '@timestamp', value: ['2019-03-18T23:17:01.645Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '24',
      timestamp: '2019-03-18T23:17:01.645Z',
      event: {
        action: ['acquired-credentials'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['unset'],
        data: { acct: ['root'], terminal: ['cron'], op: ['PAM:setcred'] },
        summary: {
          actor: { primary: ['unset'], secondary: ['root'] },
          object: { primary: ['cron'], type: ['user-session'] },
          how: ['/usr/sbin/cron'],
        },
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },
      user: { name: ['root'] },
      process: {
        pid: [9592],
        executable: ['/usr/sbin/cron'],
      },
    },
  },
  {
    _id: '25',
    data: [
      { field: '@timestamp', value: ['2019-03-19T01:17:01.336Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['siem-kibana'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '25',
      timestamp: '2019-03-19T01:17:01.336Z',
      event: {
        action: ['started-session'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['2908'],
        data: { acct: ['root'], terminal: ['cron'], op: ['PAM:session_open'] },
        summary: {
          actor: { primary: ['root'], secondary: ['root'] },
          object: { primary: ['cron'], type: ['user-session'] },
          how: ['/usr/sbin/cron'],
        },
      },
      host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
      user: { name: ['root'] },
      process: {
        pid: [725],
        executable: ['/usr/sbin/cron'],
      },
    },
  },
  {
    _id: '26',
    data: [
      { field: '@timestamp', value: ['2019-03-13T03:34:08.890Z'] },
      { field: 'event.category', value: ['user-login'] },
      { field: 'host.name', value: ['suricata-bangalore'] },
      { field: 'user.name', value: ['alice'] },
    ],
    ecs: {
      _id: '26',
      timestamp: '2019-03-13T03:34:08.890Z',
      event: {
        action: ['was-authorized'],
        module: ['auditd'],
        category: ['user-login'],
      },
      auditd: {
        result: ['success'],
        session: ['338'],
        data: { terminal: ['/dev/pts/0'] },
        summary: {
          actor: { primary: ['root'], secondary: ['alice'] },
          object: { primary: ['/dev/pts/0'], type: ['user-session'] },
          how: ['/sbin/pam_tally2'],
        },
      },
      host: {
        id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
        name: ['suricata-bangalore'],
        ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
      },
      user: { name: ['alice'] },
      process: {
        pid: [21170],
        executable: ['/sbin/pam_tally2'],
      },
    },
  },
  {
    _id: '27',
    data: [
      { field: '@timestamp', value: ['2019-03-22T19:13:11.026Z'] },
      { field: 'event.action', value: ['connected-to'] },
      { field: 'event.category', value: ['audit-rule'] },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'destination.ip', value: ['192.168.216.34'] },
      { field: 'user.name', value: ['alice'] },
    ],
    ecs: {
      _id: '27',
      timestamp: '2019-03-22T19:13:11.026Z',
      event: {
        action: ['connected-to'],
        module: ['auditd'],
        category: ['audit-rule'],
      },
      auditd: {
        result: ['success'],
        session: ['246'],
        summary: {
          actor: { primary: ['alice'], secondary: ['alice'] },
          object: { primary: ['192.168.216.34'], secondary: ['80'], type: ['socket'] },
          how: ['/usr/bin/wget'],
        },
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },
      destination: { ip: ['192.168.216.34'], port: [80] },
      user: { name: ['alice'] },
      process: {
        pid: [1490],
        name: ['wget'],
        ppid: [1476],
        executable: ['/usr/bin/wget'],
        title: ['wget www.example.com'],
      },
    },
  },
  {
    _id: '28',
    data: [
      { field: '@timestamp', value: ['2019-03-26T22:12:18.609Z'] },
      { field: 'event.action', value: ['opened-file'] },
      { field: 'event.category', value: ['audit-rule'] },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'user.name', value: ['root'] },
    ],
    ecs: {
      _id: '28',
      timestamp: '2019-03-26T22:12:18.609Z',
      event: {
        action: ['opened-file'],
        module: ['auditd'],
        category: ['audit-rule'],
      },
      auditd: {
        result: ['success'],
        session: ['242'],
        summary: {
          actor: { primary: ['unset'], secondary: ['root'] },
          object: { primary: ['/proc/15990/attr/current'], type: ['file'] },
          how: ['/lib/systemd/systemd-journald'],
        },
      },
      file: {
        path: ['/proc/15990/attr/current'],
        device: ['00:00'],
        inode: ['27672309'],
        uid: ['0'],
        owner: ['root'],
        gid: ['0'],
        group: ['root'],
        mode: ['0666'],
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },

      user: { name: ['root'] },
      process: {
        pid: [27244],
        name: ['systemd-journal'],
        ppid: [1],
        executable: ['/lib/systemd/systemd-journald'],
        title: ['/lib/systemd/systemd-journald'],
        working_directory: ['/'],
      },
    },
  },
  {
    _id: '29',
    data: [
      { field: '@timestamp', value: ['2019-04-08T21:18:57.000Z'] },
      { field: 'event.action', value: ['user_login'] },
      { field: 'event.category', value: null },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'user.name', value: ['Braden'] },
    ],
    ecs: {
      _id: '29',
      event: {
        action: ['user_login'],
        dataset: ['login'],
        kind: ['event'],
        module: ['system'],
        outcome: ['failure'],
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },
      source: {
        ip: ['128.199.212.120'],
      },
      user: {
        name: ['Braden'],
      },
      process: {
        pid: [6278],
      },
    },
  },
  {
    _id: '30',
    data: [
      { field: '@timestamp', value: ['2019-04-08T22:27:14.814Z'] },
      { field: 'event.action', value: ['process_started'] },
      { field: 'event.category', value: null },
      { field: 'host.name', value: ['zeek-london'] },
      { field: 'user.name', value: ['Evan'] },
    ],
    ecs: {
      _id: '30',
      event: {
        action: ['process_started'],
        dataset: ['login'],
        kind: ['event'],
        module: ['system'],
        outcome: ['failure'],
      },
      host: {
        id: ['7c21f5ed03b04d0299569d221fe18bbc'],
        name: ['zeek-london'],
        ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
      },
      source: {
        ip: ['128.199.212.120'],
      },
      user: {
        name: ['Evan'],
      },
      process: {
        pid: [6278],
      },
    },
  },
  {
    _id: '31',
    data: [
      { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
      { field: 'message', value: ['I am a log file message'] },
      { field: 'event.severity', value: ['3'] },
      { field: 'event.category', value: ['Access'] },
      { field: 'event.action', value: ['Action'] },
      { field: 'host.name', value: ['apache'] },
      { field: 'source.ip', value: ['192.168.0.1'] },
      { field: 'destination.ip', value: ['192.168.0.3'] },
      { field: 'destination.bytes', value: ['123456'] },
      { field: 'user.name', value: ['john.dee'] },
    ],
    ecs: {
      _id: '1',
      timestamp: '2018-11-05T19:03:25.937Z',
      host: { name: ['apache'], ip: ['192.168.0.1'] },
      event: {
        id: ['1'],
        action: ['Action'],
        category: ['Access'],
        module: ['nginx'],
        severity: [3],
      },
      message: ['I am a log file message'],
      source: { ip: ['192.168.0.1'], port: [80] },
      destination: { ip: ['192.168.0.3'], port: [6343] },
      user: { id: ['1'], name: ['john.dee'] },
      geo: { region_name: ['xx'], country_iso_code: ['xx'] },
    },
  },
  {
    _id: '32',
    data: [],
    ecs: {
      _id: 'BuBP4W0BOpWiDweSoYSg',
      timestamp: '2019-10-18T23:59:15.091Z',
      threat: {
        enrichments: [
          {
            indicator: {
              provider: ['indicator_provider'],
              reference: ['https://example.com'],
            },
            matched: {
              atomic: ['192.168.1.1'],
              field: ['source.ip'],
              type: ['ip'],
            },
            feed: {
              name: ['feed_name'],
            },
          },
        ],
      },
    },
  },
];

export const mockFimFileCreatedEvent: Ecs = {
  _id: 'WuBP4W0BOpWiDweSoYSg',
  timestamp: '2019-10-18T23:59:15.091Z',
  host: {
    architecture: ['x86_64'],
    os: {
      family: ['debian'],
      name: ['Ubuntu'],
      kernel: ['4.15.0-1046-gcp'],
      platform: ['ubuntu'],
      version: ['16.04.6 LTS (Xenial Xerus)'],
    },
    id: ['host-id-123'],
    name: ['foohost'],
  },
  file: {
    path: ['/etc/subgid'],
    size: [4445],
    owner: ['root'],
    inode: ['90027'],
    ctime: ['2019-10-18T23:59:14.872Z'],
    gid: ['0'],
    type: ['file'],
    mode: ['0644'],
    mtime: ['2019-10-18T23:59:14.872Z'],
    uid: ['0'],
    group: ['root'],
  },
  event: {
    module: ['file_integrity'],
    dataset: ['file'],
    action: ['created'],
  },
};

export const mockFimFileDeletedEvent: Ecs = {
  _id: 'M-BP4W0BOpWiDweSo4cm',
  timestamp: '2019-10-18T23:59:16.247Z',
  host: {
    name: ['foohost'],
    os: {
      platform: ['ubuntu'],
      version: ['16.04.6 LTS (Xenial Xerus)'],
      family: ['debian'],
      name: ['Ubuntu'],
      kernel: ['4.15.0-1046-gcp'],
    },
    id: ['host-id-123'],
    architecture: ['x86_64'],
  },
  event: {
    module: ['file_integrity'],
    dataset: ['file'],
    action: ['deleted'],
  },
  file: {
    path: ['/etc/gshadow.lock'],
  },
};

export const mockSocketOpenedEvent: Ecs = {
  _id: 'Vusu4m0BOpWiDweSLkXY',
  timestamp: '2019-10-19T04:02:19.473Z',
  network: {
    direction: ['outbound'],
    transport: ['tcp'],
    community_id: ['1:network-community_id'],
  },
  host: {
    name: ['foohost'],
    architecture: ['x86_64'],
    os: {
      platform: ['centos'],
      version: ['7 (Core)'],
      family: ['redhat'],
      name: ['CentOS Linux'],
      kernel: ['3.10.0-1062.1.2.el7.x86_64'],
    },
    id: ['host-id-123'],
  },
  process: {
    pid: [2166],
    name: ['google_accounts'],
  },
  destination: {
    ip: ['10.1.2.3'],
    port: [80],
  },
  user: {
    name: ['root'],
  },
  source: {
    port: [59554],
    ip: ['10.4.20.1'],
  },
  event: {
    action: ['socket_opened'],
    module: ['system'],
    dataset: ['socket'],
    kind: ['event'],
  },
  message: [
    'Outbound socket (10.4.20.1:59554 -> 10.1.2.3:80) OPENED by process google_accounts (PID: 2166) and user root (UID: 0)',
  ],
};

export const mockSocketClosedEvent: Ecs = {
  _id: 'V-su4m0BOpWiDweSLkXY',
  timestamp: '2019-10-19T04:02:19.473Z',
  process: {
    pid: [2166],
    name: ['google_accounts'],
  },
  user: {
    name: ['root'],
  },
  source: {
    port: [59508],
    ip: ['10.4.20.1'],
  },
  event: {
    dataset: ['socket'],
    kind: ['event'],
    action: ['socket_closed'],
    module: ['system'],
  },
  message: [
    'Outbound socket (10.4.20.1:59508 -> 10.1.2.3:80) CLOSED by process google_accounts (PID: 2166) and user root (UID: 0)',
  ],
  network: {
    community_id: ['1:network-community_id'],
    direction: ['outbound'],
    transport: ['tcp'],
  },
  destination: {
    ip: ['10.1.2.3'],
    port: [80],
  },
  host: {
    name: ['foohost'],
    architecture: ['x86_64'],
    os: {
      version: ['7 (Core)'],
      family: ['redhat'],
      name: ['CentOS Linux'],
      kernel: ['3.10.0-1062.1.2.el7.x86_64'],
      platform: ['centos'],
    },
    id: ['host-id-123'],
  },
};

export const mockDnsEvent: Ecs = {
  _id: 'VUTUqm0BgJt5sZM7nd5g',
  destination: {
    domain: ['ten.one.one.one'],
    port: [53],
    bytes: [137],
    ip: ['10.1.1.1'],
    geo: {
      continent_name: ['Oceania'],
      location: {
        lat: [-33.494],
        lon: [143.2104],
      },
      country_iso_code: ['AU'],
      country_name: ['Australia'],
      city_name: [''],
    },
  },
  host: {
    architecture: ['armv7l'],
    id: ['host-id'],
    os: {
      family: ['debian'],
      platform: ['raspbian'],
      version: ['9 (stretch)'],
      name: ['Raspbian GNU/Linux'],
      kernel: ['4.19.57-v7+'],
    },
    name: ['iot.example.com'],
  },
  dns: {
    question: {
      name: ['lookup.example.com'],
      type: ['A'],
    },
    response_code: ['NOERROR'],
    resolved_ip: ['10.1.2.3'],
  },
  timestamp: '2019-10-08T10:05:23.241Z',
  network: {
    community_id: ['1:network-community_id'],
    direction: ['outbound'],
    bytes: [177],
    transport: ['udp'],
    protocol: ['dns'],
  },
  event: {
    duration: [6937500],
    category: ['network_traffic'],
    dataset: ['dns'],
    kind: ['event'],
    end: ['2019-10-08T10:05:23.248Z'],
    start: ['2019-10-08T10:05:23.241Z'],
  },
  source: {
    port: [58732],
    bytes: [40],
    ip: ['10.9.9.9'],
  },
};

export const mockEndpointProcessExecutionMalwarePreventionAlert: Ecs = {
  process: {
    hash: {
      md5: ['177afc1eb0be88eb9983fb74111260c4'],
      sha256: ['3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb'],
      sha1: ['f573b85e9beb32121f1949217947b2adc6749e3d'],
    },
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTY5MjAtMTMyNDg5OTk2OTAuNDgzMzA3NzAw',
    ],
    executable: [
      'C:\\Users\\sean\\Downloads\\3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb.exe',
    ],
    name: [
      'C:\\Users\\sean\\Downloads\\3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb.exe',
    ],
    pid: [6920],
    args: [
      'C:\\Users\\sean\\Downloads\\3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb.exe',
    ],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1518)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1518)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1518)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
    name: ['win2019-endpoint-1'],
  },
  file: {
    mtime: ['2020-11-04T21:40:51.494Z'],
    path: [
      'C:\\Users\\sean\\Downloads\\3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb.exe',
    ],
    owner: ['sean'],
    hash: {
      md5: ['177afc1eb0be88eb9983fb74111260c4'],
      sha256: ['3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb'],
      sha1: ['f573b85e9beb32121f1949217947b2adc6749e3d'],
    },
    name: ['3be13acde2f4dcded4fd8d518a513bfc9882407a6e384ffb17d12710db7d76fb.exe'],
    extension: ['exe'],
    size: [1604112],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'process'],
    outcome: ['success'],
    severity: [73],
    code: ['malicious_file'],
    action: ['execution'],
    id: ['LsuMZVr+sdhvehVM++++Gp2Y'],
    kind: ['alert'],
    created: ['2020-11-04T21:41:30.533Z'],
    module: ['endpoint'],
    type: ['info', 'start', 'denied'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2020-11-04T21:41:30.533Z',
  message: ['Malware Prevention Alert'],
  _id: '0dA2lXUBn9bLIbfPkY7d',
};

export const mockEndpointLibraryLoadEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\System32\\bcrypt.dll'],
    hash: {
      md5: ['00439016776de367bad087d739a03797'],
      sha1: ['2c4ba5c1482987d50a182bad915f52cd6611ee63'],
      sha256: ['e70f5d8f87aab14e3160227d38387889befbe37fa4f8f5adc59eff52804b35fd'],
    },
    name: ['bcrypt.dll'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['library'],
    kind: ['event'],
    created: ['2021-02-05T21:27:23.921Z'],
    module: ['endpoint'],
    action: ['load'],
    type: ['start'],
    id: ['LzzWB9jjGmCwGMvk++++Da5H'],
    dataset: ['endpoint.events.library'],
  },
  process: {
    name: ['sshd.exe'],
    pid: [9644],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTk2NDQtMTMyNTcwMzQwNDEuNzgyMTczODAw',
    ],
    executable: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint DLL load event'],
  timestamp: '2021-02-05T21:27:23.921Z',
  _id: 'IAUYdHcBGrBB52F2zo8Q',
};

export const mockEndpointRegistryModificationEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['registry'],
    kind: ['event'],
    created: ['2021-02-04T13:44:31.559Z'],
    module: ['endpoint'],
    action: ['modification'],
    type: ['change'],
    id: ['LzzWB9jjGmCwGMvk++++CbOn'],
    dataset: ['endpoint.events.registry'],
  },
  process: {
    name: ['GoogleUpdate.exe'],
    pid: [7408],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTc0MDgtMTMyNTY5MTk4NDguODY4NTI0ODAw',
    ],
    executable: ['C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe'],
  },
  registry: {
    hive: ['HKLM'],
    key: [
      'SOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentState',
    ],
    path: [
      'HKLM\\SOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentState\\StateValue',
    ],
    value: ['StateValue'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint registry event'],
  timestamp: '2021-02-04T13:44:31.559Z',
  _id: '4cxLbXcBGrBB52F2uOfF',
};

export const mockTgridModel: TGridModel = {
  columns: [
    {
      columnHeaderType: 'not-filtered',
      id: '@timestamp',
      initialWidth: 190,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'message',
      initialWidth: 180,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'event.category',
      initialWidth: 180,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'host.name',
      initialWidth: 180,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'source.ip',
      initialWidth: 180,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'destination.ip',
      initialWidth: 180,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'user.name',
      initialWidth: 180,
    },
  ],
  dataProviders: [],
  dataViewId: null,
  defaultColumns: [],
  queryFields: [],
  dateRange: {
    end: '2020-03-18T13:52:38.929Z',
    start: '2020-03-18T13:46:38.929Z',
  },
  deletedEventIds: [],
  excludedRowRendererIds: [],
  expandedDetail: {},
  documentType: '',
  selectAll: false,
  id: 'ef579e40-jibber-jabber',
  indexNames: [],
  isLoading: false,
  isSelectAllChecked: false,
  kqlQuery: {
    filterQuery: null,
  },
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  loadingEventIds: [],
  savedObjectId: 'ef579e40-jibber-jabber',
  selectedEventIds: {},
  showCheckboxes: false,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'number',
      sortDirection: Direction.desc,
    },
  ],
  title: 'Test rule',
  version: '1',
  timelineType: 'default',
};
