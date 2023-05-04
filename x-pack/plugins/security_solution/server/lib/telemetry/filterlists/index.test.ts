/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyAllowlistedFields } from '.';

describe('Security Telemetry filters', () => {
  describe('allowlistEventFields', () => {
    const allowlist = {
      _id: true,
      a: true,
      b: true,
      c: {
        d: true,
      },
      'kibana.alert.ancestors': true,
      'kibana.alert.original_event.module': true,
      'event.id': true,
      'event.ingested': true,
      'event.kind': true,
      'event.module': true,
      'event.outcome': true,
      'event.provider': true,
      'event.type': true,
      'powershell.file.script_block_text': true,
      'kubernetes.pod.uid': true,
      'kubernetes.pod.name': true,
      'kubernetes.pod.ip': true,
      package_version: true,
    };

    it('filters top level', () => {
      const event = {
        _id: 'id',
        a: 'a',
        a1: 'a1',
        b: 'b',
        b1: 'b1',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        _id: 'id',
        a: 'a',
        b: 'b',
      });
    });

    it('filters nested', () => {
      const event = {
        a: {
          a1: 'a1',
        },
        a1: 'a1',
        b: {
          b1: 'b1',
        },
        b1: 'b1',
        c: {
          d: 'd',
          e: 'e',
          f: 'f',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: {
          a1: 'a1',
        },
        b: {
          b1: 'b1',
        },
        c: {
          d: 'd',
        },
      });
    });

    it('filters arrays of objects', () => {
      const event = {
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
            e: 'e1',
            f: 'f1',
          },
          {
            d: 'd2',
            e: 'e2',
            f: 'f2',
          },
          {
            d: 'd3',
            e: 'e3',
            f: 'f3',
          },
        ],
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
          },
          {
            d: 'd2',
          },
          {
            d: 'd3',
          },
        ],
      });
    });

    it("doesn't create empty objects", () => {
      const event = {
        a: 'a',
        b: 'b',
        c: {
          e: 'e',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: 'a',
        b: 'b',
      });
    });

    it("copies long nested strings that shouldn't be broken up on customer deployments", () => {
      const event = {
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
        'kibana.random.long.alert.string': {
          info: 'data',
        },
        'powershell.file.script_block_text': 'h1rY5xI2hC8S#Gv&CB**7hlYV7o',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
        'powershell.file.script_block_text': 'h1rY5xI2hC8S#Gv&CB**7hlYV7o',
      });
    });

    it('copies alert event fields for cross timeline reference', () => {
      const event = {
        not_event: 'much data, much wow',
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'event.kind': 'signal',
        'event.module': 'aws',
        'event.outcome': 'success',
        'event.provider': 'iam.amazonaws.com',
        'event.type': ['user', 'creation'],
        package_version: '3.4.1',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'event.kind': 'signal',
        'event.module': 'aws',
        'event.outcome': 'success',
        'event.provider': 'iam.amazonaws.com',
        'event.type': ['user', 'creation'],
        package_version: '3.4.1',
      });
    });

    it('copies over kubernetes fields', () => {
      const event = {
        not_event: 'much data, much wow',
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'kubernetes.pod.uid': '059a3767-7492-4fb5-92d4-93f458ddab44',
        'kubernetes.pod.name': 'kube-dns-6f4fd4zzz-7z7xj',
        'kubernetes.pod.ip': '10-245-0-5',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'kubernetes.pod.uid': '059a3767-7492-4fb5-92d4-93f458ddab44',
        'kubernetes.pod.name': 'kube-dns-6f4fd4zzz-7z7xj',
        'kubernetes.pod.ip': '10-245-0-5',
      });
    });
  });
});
