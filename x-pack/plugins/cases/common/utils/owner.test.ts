/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { OWNER_INFO } from '../constants';
import { getCaseOwnerByAppId, getOwnerFromRuleConsumerProducer, isValidOwner } from './owner';

describe('owner utils', () => {
  describe('isValidOwner', () => {
    const owners = Object.keys(OWNER_INFO) as Array<keyof typeof OWNER_INFO>;

    it.each(owners)('returns true for valid owner: %s', (owner) => {
      expect(isValidOwner(owner)).toBe(true);
    });

    it('return false for invalid owner', () => {
      expect(isValidOwner('not-valid')).toBe(false);
    });
  });

  describe('getCaseOwnerByAppId', () => {
    const tests = Object.values(OWNER_INFO).map((info) => [info.id, info.appId]);

    it.each(tests)('for owner %s it returns %s', (owner, appId) => {
      expect(getCaseOwnerByAppId(appId)).toBe(owner);
    });

    it('return undefined for invalid application ID', () => {
      expect(getCaseOwnerByAppId('not-valid')).toBe(undefined);
    });
  });

  describe('getOwnerFromRuleConsumerProducer', () => {
    const owners = Object.values(OWNER_INFO).map((item) => ({
      id: item.id,
      validRuleConsumers: item.validRuleConsumers,
    }));

    it.each(owners)('returns owner %s correctly for consumer', (owner) => {
      for (const consumer of owner.validRuleConsumers ?? []) {
        const result = getOwnerFromRuleConsumerProducer({ consumer });

        expect(result).toBe(owner.id);
      }
    });

    it.each(owners)('returns owner %s correctly for producer', (owner) => {
      for (const producer of owner.validRuleConsumers ?? []) {
        const result = getOwnerFromRuleConsumerProducer({ producer });

        expect(result).toBe(owner.id);
      }
    });

    it('returns cases as a default owner', () => {
      const owner = getOwnerFromRuleConsumerProducer({});

      expect(owner).toBe(OWNER_INFO.cases.id);
    });

    it('returns owner as per consumer when both values are passed', () => {
      const owner = getOwnerFromRuleConsumerProducer({
        consumer: AlertConsumers.SIEM,
        producer: AlertConsumers.OBSERVABILITY,
      });

      expect(owner).toBe(OWNER_INFO.securitySolution.id);
    });

    it('returns securitySolution owner if project isServerlessSecurity', () => {
      const owner = getOwnerFromRuleConsumerProducer({
        consumer: AlertConsumers.OBSERVABILITY,
        producer: AlertConsumers.OBSERVABILITY,
        isServerlessSecurity: true,
      });

      expect(owner).toBe(OWNER_INFO.securitySolution.id);
    });
  });
});
