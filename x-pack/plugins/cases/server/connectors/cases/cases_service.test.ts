/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';

import { isEmpty, set } from 'lodash';
import { CasesService } from './cases_service';

describe('CasesService', () => {
  let service: CasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesService();
  });

  describe('getCaseId', () => {
    it('return the record ID correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };
      const counter = 1;

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ ruleId, spaceId, owner, grouping, counter })).toEqual(hex);
    });

    it('sorts the grouping definition correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };
      const sortedGrouping = { 'agent.id': '8a4f500d', 'host.ip': '0.0.0.1' };
      const counter = 1;

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(sortedGrouping)}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ ruleId, spaceId, owner, grouping, counter })).toEqual(hex);
    });

    it('return the record ID correctly without grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const counter = 1;

      const payload = `${ruleId}:${spaceId}:${owner}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ ruleId, spaceId, owner, counter })).toEqual(hex);
    });

    it('return the record ID correctly with empty grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = {};
      const counter = 1;

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ ruleId, spaceId, owner, grouping, counter })).toEqual(hex);
    });

    it('return the record ID correctly without rule', async () => {
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };
      const counter = 1;

      const payload = `${spaceId}:${owner}:${stringify(grouping)}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ spaceId, owner, grouping, counter })).toEqual(hex);
    });

    it('throws an error when the ruleId and the grouping is missing', async () => {
      const spaceId = 'default';
      const owner = 'cases';
      const counter = 1;

      expect(() =>
        // @ts-expect-error: ruleId and grouping are omitted for testing
        service.getCaseId({ spaceId, owner, counter })
      ).toThrowErrorMatchingInlineSnapshot(`"ruleID or grouping is required"`);
    });

    it.each(['ruleId', 'spaceId', 'owner'])(
      'return the record ID correctly with empty string for %s',
      async (key) => {
        const getPayloadValue = (value: string) => (isEmpty(value) ? '' : `${value}:`);

        const params = {
          ruleId: 'test-rule-id',
          spaceId: 'default',
          owner: 'cases',
        };

        const grouping = { 'host.ip': '0.0.0.1' };
        const counter = 1;

        set(params, key, '');

        const payload = `${getPayloadValue(params.ruleId)}${getPayloadValue(
          params.spaceId
        )}${getPayloadValue(params.owner)}${stringify(grouping)}:${counter}`;

        const hash = createHash('sha256');

        hash.update(payload);

        const hex = hash.digest('hex');

        expect(service.getCaseId({ ...params, grouping, counter })).toEqual(hex);
      }
    );

    it('constructs a record ID with special characters correctly', async () => {
      const ruleId = `{}=:&".'/{}}`;
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { '{:}': `{}=:&".'/{}}` };
      const counter = 1;

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}:${counter}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getCaseId({ ruleId, spaceId, owner, grouping, counter })).toEqual(hex);
    });
  });
});
