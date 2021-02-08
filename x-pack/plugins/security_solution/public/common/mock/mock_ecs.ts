/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ecs } from '../../../common/ecs';

export const mockEcsData: Ecs[] = [
  {
    _id: '1',
    timestamp: '2018-11-05T19:03:25.937Z',
    host: {
      name: ['apache'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['1'],
      action: ['Action'],
      category: ['Access'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.1'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['1'],
      name: ['john.dee'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '3',
    timestamp: '2018-11-07T19:03:25.937Z',
    host: {
      name: ['nginx'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['3'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [1],
    },
    source: {
      ip: ['192.168.0.3'],
      port: [443],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['3'],
      name: ['evan.davis'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '4',
    timestamp: '2018-11-08T19:03:25.937Z',
    host: {
      name: ['suricata'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['4'],
      category: ['Attempted Administrator Privilege Gain'],
      type: ['Alert'],
      module: ['suricata'],
      severity: [1],
    },
    source: {
      ip: ['192.168.0.3'],
      port: [53],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
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
    user: {
      id: ['4'],
      name: ['jenny.jones'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '5',
    timestamp: '2018-11-09T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['5'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.3'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['5'],
      name: ['becky.davis'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '6',
    timestamp: '2018-11-10T19:03:25.937Z',
    host: {
      name: ['braden.davis'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['6'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.6'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '8',
    timestamp: '2018-11-12T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
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
    source: {
      ip: ['192.168.0.8'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['8'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '7',
    timestamp: '2018-11-11T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['7'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['apache'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.7'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['7'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '9',
    timestamp: '2018-11-13T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['9'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.9'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['9'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '10',
    timestamp: '2018-11-14T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['10'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.10'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['10'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '11',
    timestamp: '2018-11-15T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['11'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.11'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['11'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '12',
    timestamp: '2018-11-16T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['12'],
      category: ['Access'],
      type: ['HTTP Request'],
      module: ['nginx'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.12'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['12'],
      name: ['jone.doe'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '2',
    timestamp: '2018-11-06T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['2'],
      category: ['Authentication'],
      type: ['Authentication Success'],
      module: ['authlog'],
      severity: [3],
    },
    source: {
      ip: ['192.168.0.2'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['1'],
      name: ['joe.bob'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
    _id: '13',
    timestamp: '2018-13-12T19:03:25.937Z',
    host: {
      name: ['joe.computer'],
      ip: ['192.168.0.1'],
    },
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
    source: {
      ip: ['192.168.0.8'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
  },
  {
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
    source: {
      ip: ['185.176.26.101'],
      port: [44059],
    },
    destination: {
      ip: ['207.154.238.205'],
      port: [11568],
    },
    geo: {
      region_name: ['New York'],
      country_iso_code: ['US'],
    },
    network: {
      transport: ['tcp'],
    },
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
  {
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
    source: {
      ip: ['206.189.35.240'],
      port: [57475],
    },
    destination: {
      ip: ['67.207.67.3'],
      port: [53],
    },
    geo: {
      region_name: ['New York'],
      country_iso_code: ['US'],
    },
    network: {
      transport: ['udp'],
    },
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
  {
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
    source: {
      ip: ['206.189.35.240'],
      port: [36220],
    },
    destination: {
      ip: ['192.241.164.26'],
      port: [80],
    },
    geo: {
      region_name: ['New York'],
      country_iso_code: ['US'],
    },
    http: {
      version: ['1.1'],
      request: {
        body: {
          bytes: [0],
        },
      },
      response: {
        status_code: [302],
        body: {
          bytes: [154],
        },
      },
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
  {
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
    source: {
      ip: ['8.42.77.171'],
    },
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
  {
    _id: '18',
    timestamp: '2019-02-22T21:12:13.000Z',
    event: {
      module: ['zeek'],
      dataset: ['zeek.ssl'],
    },
    host: {
      id: ['2ce8b1e7d69e4a1d9c6bcddc473da9d9'],
      name: ['zeek-sensor-amsterdam'],
    },
    source: {
      ip: ['188.166.66.184'],
      port: [34514],
    },
    destination: {
      ip: ['91.189.95.15'],
      port: [443],
    },
    geo: {
      region_name: ['England'],
      country_iso_code: ['GB'],
    },
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
  {
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
  {
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
    user: {
      name: ['alice'],
    },
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
  {
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
      data: {
        terminal: ['/dev/pts/0'],
        op: ['login'],
      },
      summary: {
        actor: {
          primary: ['alice'],
          secondary: ['alice'],
        },
        object: {
          primary: ['/dev/pts/0'],
          secondary: ['8.42.77.171'],
          type: ['user-session'],
        },
        how: ['/usr/sbin/sshd'],
      },
    },
    host: {
      id: ['7c21f5ed03b04d0299569d221fe18bbc'],
      name: ['zeek-london'],
      ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
    },
    source: {
      ip: ['8.42.77.171'],
    },
    user: {
      name: ['root'],
    },
    process: {
      pid: [17471],
      executable: ['/usr/sbin/sshd'],
    },
  },
  {
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
      data: {
        acct: ['alice'],
        terminal: ['ssh'],
        op: ['PAM:setcred'],
      },
      summary: {
        actor: {
          primary: ['alice'],
          secondary: ['alice'],
        },
        object: {
          primary: ['ssh'],
          secondary: ['8.42.77.171'],
          type: ['user-session'],
        },
        how: ['/usr/sbin/sshd'],
      },
    },
    host: {
      id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
      name: ['suricata-bangalore'],
      ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
    },
    user: {
      name: ['root'],
    },
    process: {
      pid: [21202],
      executable: ['/usr/sbin/sshd'],
    },
  },
  {
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
      data: {
        acct: ['alice'],
        terminal: ['ssh'],
        op: ['PAM:session_close'],
      },
      summary: {
        actor: {
          primary: ['alice'],
          secondary: ['alice'],
        },
        object: {
          primary: ['ssh'],
          secondary: ['8.42.77.171'],
          type: ['user-session'],
        },
        how: ['/usr/sbin/sshd'],
      },
    },
    host: {
      id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
      name: ['suricata-bangalore'],
      ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
    },
    user: {
      name: ['root'],
    },
    process: {
      pid: [21202],
      executable: ['/usr/sbin/sshd'],
    },
  },
  {
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
      data: {
        acct: ['root'],
        terminal: ['cron'],
        op: ['PAM:setcred'],
      },
      summary: {
        actor: {
          primary: ['unset'],
          secondary: ['root'],
        },
        object: {
          primary: ['cron'],
          type: ['user-session'],
        },
        how: ['/usr/sbin/cron'],
      },
    },
    host: {
      id: ['7c21f5ed03b04d0299569d221fe18bbc'],
      name: ['zeek-london'],
      ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
    },
    user: {
      name: ['root'],
    },
    process: {
      pid: [9592],
      executable: ['/usr/sbin/cron'],
    },
  },
  {
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
      data: {
        acct: ['root'],
        terminal: ['cron'],
        op: ['PAM:session_open'],
      },
      summary: {
        actor: {
          primary: ['root'],
          secondary: ['root'],
        },
        object: {
          primary: ['cron'],
          type: ['user-session'],
        },
        how: ['[/usr/sbin/cron'],
      },
    },
    host: {
      id: ['aa7ca589f1b8220002f2fc61c64cfbf1'],
      name: ['siem-kibana'],
    },
    user: {
      name: ['root'],
    },
    process: {
      pid: [725],
      executable: ['/usr/sbin/cron'],
    },
  },
  {
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
      data: {
        terminal: ['/dev/pts/0'],
      },
      summary: {
        actor: {
          primary: ['root'],
          secondary: ['alice'],
        },
        object: {
          primary: ['/dev/pts/0'],
          type: ['user-session'],
        },
        how: ['/sbin/pam_tally2'],
      },
    },
    host: {
      id: ['0a63559c1acf4c419d979c4b4d8b83ff'],
      name: ['suricata-bangalore'],
      ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
    },
    user: {
      name: ['alice'],
    },
    process: {
      pid: [21170],
      executable: ['/sbin/pam_tally2'],
    },
  },
  {
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
        actor: {
          primary: ['alice'],
          secondary: ['alice'],
        },
        object: {
          primary: ['93.184.216.34'],
          secondary: ['80'],
          type: ['socket'],
        },
        how: ['/usr/bin/wget'],
      },
    },
    host: {
      id: ['7c21f5ed03b04d0299569d221fe18bbc'],
      name: ['zeek-london'],
      ip: ['46.101.3.136', '10.16.0.5', 'fe80::4066:42ff:fe19:b3b9'],
    },
    destination: {
      ip: ['93.184.216.34'],
      port: [80],
    },
    user: {
      name: ['alice'],
    },
    process: {
      pid: [1490],
      name: ['wget'],
      ppid: [1476],
      executable: ['/usr/bin/wget'],
      title: ['wget www.example.com'],
    },
  },
  {
    _id: '28',
    timestamp: '2019-03-26T22:12:18.609Z',
    event: {
      action: ['opened-file'],
      module: ['auditd'],
      category: ['audit-rule'],
    },
    auditd: {
      result: ['success'],
      session: ['unset'],
      summary: {
        actor: {
          primary: ['unset'],
          secondary: ['root'],
        },
        object: {
          primary: ['/proc/15990/attr/current'],
          type: ['file'],
        },
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

    user: {
      name: ['root'],
    },
    process: {
      pid: [27244],
      name: ['systemd-journal'],
      ppid: [1],
      executable: ['/lib/systemd/systemd-journald'],
      title: ['/lib/systemd/systemd-journald'],
      working_directory: ['/'],
    },
  },
];

export const mockEcsDataWithAlert: Ecs = {
  _id: '1',
  timestamp: '2018-11-05T19:03:25.937Z',
  host: {
    name: ['apache'],
    ip: ['192.168.0.1'],
  },
  event: {
    id: ['1'],
    action: ['Action'],
    category: ['Access'],
    module: ['nginx'],
    severity: [3],
  },
  source: {
    ip: ['192.168.0.1'],
    port: [80],
  },
  destination: {
    ip: ['192.168.0.3'],
    port: [6343],
  },
  user: {
    id: ['1'],
    name: ['john.dee'],
  },
  geo: {
    region_name: ['xx'],
    country_iso_code: ['xx'],
  },
  signal: {
    rule: {
      created_at: ['2020-01-10T21:11:45.839Z'],
      updated_at: ['2020-01-10T21:11:45.839Z'],
      created_by: ['elastic'],
      description: ['24/7'],
      enabled: [true],
      false_positives: ['test-1'],
      filters: [],
      from: ['now-300s'],
      id: ['b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
      immutable: [false],
      index: ['auditbeat-*'],
      interval: ['5m'],
      rule_id: ['rule-id-1'],
      language: ['kuery'],
      output_index: ['.siem-signals-default'],
      max_signals: [100],
      risk_score: ['21'],
      query: ['user.name: root or user.name: admin'],
      references: ['www.test.co'],
      saved_id: ["Garrett's IP"],
      timeline_id: ['1234-2136-11ea-9864-ebc8cc1cb8c2'],
      timeline_title: ['Untitled timeline'],
      severity: ['low'],
      updated_by: ['elastic'],
      tags: [],
      to: ['now'],
      type: ['saved_query'],
      threat: [],
      note: ['# this is some markdown documentation'],
      version: ['1'],
    },
  },
};
