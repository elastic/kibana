/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertResultList } from '../../../../../common/types';

export const mockAlertResultList: (options?: {
  total?: number;
  request_page_size?: number;
  request_page_index?: number;
}) => AlertResultList = (options = {}) => {
  const {
    total = 1,
    request_page_size: requestPageSize = 10,
    request_page_index: requestPageIndex = 0,
  } = options;

  // Skip any that are before the page we're on
  const numberToSkip = requestPageSize * requestPageIndex;

  // total - numberToSkip is the count of non-skipped ones, but return no more than a pageSize, and no less than 0
  const actualCountToReturn = Math.max(Math.min(total - numberToSkip, requestPageSize), 0);

  const alerts = [];
  for (let index = 0; index < actualCountToReturn; index++) {
    alerts.push({
      '@timestamp': 1542341895000,
      id: 'xDUYMHABAJk0XnHd8rrd',
      agent: {
        id: 'ced9c68e-b94a-4d66-bb4c-6106514f0a2f',
        version: '3.0.0',
      },
      host: {
        id: 'xrctvybuni',
        hostname: 'HD-c15-bc09190a',
        ip: ['10.179.244.14'],
        mac: ['xsertcyvbunimkn56edtyf'],
        os: {
          full: 'Windows 10',
          name: 'windows',
          version: '10',
          variant: '3',
        },
      },
      thread: {},
      prev: null,
      next: null,
      event: {
        id: '2f1c0928-3876-4e11-acbb-9199257c7b1c',
        action: 'creation',
        category: 'malware',
        dataset: 'endpoint',
        kind: 'alert',
        module: 'endpoint',
        type: 'creation',
      },
      file: {
        accessed: 1542789400,
        created: 1542789400,
        hash: {
          md5: '4ace3baaa509d08510405e1b169e325b',
          sha1: '27fb21cf5db95ffca43b234affa99becc4023b9d',
          sha256: '6ed1c836dbf099be7845bdab7671def2c157643761b52251e04e9b6ee109ec75',
        },
        pe: {
          imphash: '835d619dfdf3cc727cebd91300ab3462',
        },
        mtime: 1542789400,
        owner: 'Administrators',
        name: 'test name',
        path: 'C:\\Windows\\TEMP\\tmp0000008f\\tmp00001be5',
        size: 188416,
        code_signature: {
          subject_name: 'Cybereason Inc',
          trusted: false,
        },
        malware_classifier: {
          features: {
            data: {
              buffer:
                'eAHtnU1oHHUUwHsQ7MGDiIIUD4sH8WBBxJtopiLoUY0pYo2ZTbJJ0yQ17m4+ms/NRzeVWpuUWCL4sWlEYvFQ8KJQ6NCTEA8eRD30sIo3PdSriLi7837Pko3LbHZ2M5m+XObHm/d/X////83O7jCZvzacHBpPplNdfalkdjSdyty674Ft59dN71Dpb9v5eKh8LMEHjsCF2wIfVlRKsHROYPGkQO5+gY2vBSYYdWZFYGwEO/cITHMqkxPYnBBY+07gtCuQ9gSGigJ5lPPYGXcE+jA4z3Ad1ZtAUiDUyrEEPYzqRnIKgxd/Rgc7gygPo5wn95PouN7OeEYJ1UXiJgRmvscgp/LOziIkkSyT+xRVnXhZ4DKh5goCkzidRHkGO4uvCyw9LDDtCay8ILCAzrJOJaGuZwUuvSewivJVIPsklq8JbL4qMJsTSCcExrGs83WKU295ZFo5lr2TaZbcUw5FeJy8tgTeLpCy2iGeS67ABXzlgbEi1UC5FxcZnA4y/CLK82Qxi847FGGZRTLsCUxR1aWEwOp1AmOjDRYYzgwusL9WfqBiGJxnVAanixTq7Dp22LBdlWMJzlOx8wmBK2Rx5WmBLJIRwtAijOQE+ooCb2B5xBOYRtlfNeXpLpA7oyZRTqHzGenkmIJPnhBIMrzTwSA6H93CO5l+c1NA99f6IwLH8fUKdjTmDpTbgS50+gGVnECnE4PpooC2guPoaPADSHrcncNHmEHtAFkq3+EI+A37zsrrTvH3WTkvJLoOTyBp10wx2JcgVCRahA4NrICE4a+hrMXsA3qAHItW188E8ejO7XV3eh/KCYwxlamEwCgL8lN2wTntfrhY/U0g/5KAdvUpT+AszWqBdqH7VLeeZrExK9Cv1UgIDKA8g/cx7QAEP+AhAfRaMKB2HOJh+BSFSqKjSytNGBlc6PrpxvK7lCVDxbSG3Z7AhCMwx6gelwgLAltXBXJUTH29j+U1LHdipx/QprfKfGnF0sBpdBYxmEQyTzW0h6/0khcuhhJYRufym+i4VKMocJMs/KvfoW3/UJb4PeZOSZVONThZz4djP/75TAXa/CVfOvX3RgVLIDreLPN1pP1osW7lGmHsEhjBOzf+EPBE4vndvWz5xb/cChxGcv1LAb+tluALKnZ47isf1MXvz1ZMlsCXbXtPceqhrcp1ps6YHwQeBXLEPCf7q23tl9uJui0bGBgYRAccv7uXr/g5Af+2oNTrpgTa/vnpjBvpLAwM4gRBPvIZGBgYGBgYGBgYGBgYGBgYGBgYGBgYNAOc9oMXs4GBgYFBcNBnww5QzDXgRtPSaZ5lg/itsRaslgZ3bnWEEVnhMetIBwiiVnlbCbWrEftrt11zdwWnseFW1QO63w1is3ptD1pV9xG0t+zvfUrzrvh380qwXWAVCw6h78GIfG7ZlzltXu6hd+y92fECRFhjuH3bXG8N43oXEHperdzvUbteaDxhVTUeq25fqhG1X6Ai8mtF6BDXz2wR+dzSgg4Qsxls5T11XMG+82y8GkG+b7kL69xg7mF1SFvhBgYGsYH/Xi7HE+PVkiB2jt1bNZxT+k4558jR53ydz5//1m1KOgYGBgYGBgYGEQfnsYaG2z1sdPJS79XQSu91ndobOAHCaN5vNzUk1bceQVzUpbw3iOuT+UFmR18bHrp3gyhDC56lCd1y85w2+HSNUwVhhdGC7blLf+bV/fqtvhMg1NDjCcugB1QXswbs8ekj/v1BgzFHBIIsyP+HfwFdMpzu',
              decompressed_size: 27831,
              encoding: 'zlib',
            },
          },
          identifier: 'endpointpe',
          score: 1,
          threshold: 0.66,
          version: '3.0.33',
        },
        temp_file_path: 'C:\\Windows\\TEMP\\1bb9abfc-ca14-47b2-9f2c-10c323df42f9',
      },
      process: {
        pid: 1076,
        ppid: 432,
        entity_id: 'wertqwer',
        parent: {
          pid: 432,
          entity_id: 'adsfsdaf',
        },
        name: 'test name',
        code_signature: {
          subject_name: 'Cybereason Inc',
          trusted: true,
        },
        command_line: '"C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe"',
        domain: 'NT AUTHORITY',
        executable: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
        hash: {
          md5: '1f2d082566b0fc5f2c238a5180db7451',
          sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
          sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
        },
        pe: {
          imphash: 'c30d230b81c734e82e86e2e2fe01cd01',
        },
        malware_classifier: {
          identifier: 'Whitelisted',
          score: 0,
          threshold: 0,
          version: '3.0.0',
        },
        thread: [
          {
            id: 1652,
            service_name: 'CybereasonAntiMalware',
            start: 1542788400,
            start_address: 8791698721056,
            start_address_module: 'C:\\Program Files\\Cybereason ActiveProbe\\gzfltum.dll',
          },
        ],
        sid: 'S-1-5-18',
        start: 1542788400,
        token: {
          domain: 'NT AUTHORITY',
          integrity_level: 16384,
          integrity_level_name: 'system',
          privileges: [
            {
              description: 'Replace a process level token',
              enabled: false,
              name: 'SeAssignPrimaryTokenPrivilege',
            },
          ],
          sid: 'S-1-5-18',
          type: 'tokenPrimary',
          user: 'SYSTEM',
        },
        uptime: 1025,
        user: 'SYSTEM',
      },
      dll: [
        {
          pe: {
            architecture: 'x64',
            imphash: 'c30d230b81c734e82e86e2e2fe01cd01',
          },
          code_signature: {
            subject_name: 'Cybereason Inc',
            trusted: true,
          },
          compile_time: 1534424710,
          hash: {
            md5: '1f2d082566b0fc5f2c238a5180db7451',
            sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
            sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
          },
          malware_classifier: {
            identifier: 'Whitelisted',
            score: 0,
            threshold: 0,
            version: '3.0.0',
          },
          mapped_address: 5362483200,
          mapped_size: 0,
          path: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
        },
      ],
    });
  }
  const mock: AlertResultList = {
    alerts,
    total,
    request_page_size: requestPageSize,
    request_page_index: requestPageIndex,
    next: '/api/endpoint/alerts?after=1542341895000&after=2f1c0928-3876-4e11-acbb-9199257c7b1c',
    prev: '/api/endpoint/alerts?before=1542341895000&before=2f1c0928-3876-4e11-acbb-9199257c7b1c',
    result_from_index: 0,
  };
  return mock;
};
