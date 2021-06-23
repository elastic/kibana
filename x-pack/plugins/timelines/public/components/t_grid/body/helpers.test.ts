/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ecs } from '../../../../common/ecs';
import { stringifyEvent } from './helpers';

describe('helpers', () => {
  describe('stringifyEvent', () => {
    test('it omits __typename when it appears at arbitrary levels', () => {
      const toStringify: Ecs = {
        __typename: 'level 0',
        _id: '4',
        timestamp: '2018-11-08T19:03:25.937Z',
        host: {
          __typename: 'level 1',
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
              signature: ['ET PHONE HOME Stack Overflow (CVE-2019-90210)'],
              signature_id: [4],
              __typename: 'level 2',
            },
          },
        },
        user: {
          id: ['4'],
          name: ['jack.black'],
        },
        geo: {
          region_name: ['neither'],
          country_iso_code: ['sasquatch'],
        },
      } as Ecs; // as cast so that `__typename` can be added for the tests even though it is not part of ECS
      const expected: Ecs = {
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
              signature: ['ET PHONE HOME Stack Overflow (CVE-2019-90210)'],
              signature_id: [4],
            },
          },
        },
        user: {
          id: ['4'],
          name: ['jack.black'],
        },
        geo: {
          region_name: ['neither'],
          country_iso_code: ['sasquatch'],
        },
      };
      expect(JSON.parse(stringifyEvent(toStringify))).toEqual(expected);
    });

    test('it omits null and undefined values at arbitrary levels, for arbitrary data types', () => {
      const expected: Ecs = {
        _id: '4',
        host: {},
        event: {
          id: ['4'],
          category: ['theory'],
          type: ['Alert'],
          module: ['me'],
          severity: [1],
        },
        source: {
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
              signature: ['dance moves'],
            },
          },
        },
        user: {
          id: ['4'],
          name: ['no use for a'],
        },
        geo: {
          region_name: ['bizzaro'],
          country_iso_code: ['world'],
        },
      };
      const toStringify: Ecs = {
        _id: '4',
        host: {},
        event: {
          id: ['4'],
          category: ['theory'],
          type: ['Alert'],
          module: ['me'],
          severity: [1],
        },
        source: {
          ip: undefined,
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
              signature: ['dance moves'],
              signature_id: undefined,
            },
          },
        },
        user: {
          id: ['4'],
          name: ['no use for a'],
        },
        geo: {
          region_name: ['bizzaro'],
          country_iso_code: ['world'],
        },
      };
      expect(JSON.parse(stringifyEvent(toStringify))).toEqual(expected);
    });
  });
});
