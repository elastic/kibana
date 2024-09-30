/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { retrievePrebuiltRulesMap } from './prebuilt_rules';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { SplunkRule } from '../../../../../../../../common/api/siem_migrations/splunk/rules/splunk_rule.gen';

jest.mock(
  '../../../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client',
  () => ({ createPrebuiltRuleObjectsClient: jest.fn() })
);
jest.mock(
  '../../../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client',
  () => ({ createPrebuiltRuleAssetsClient: jest.fn() })
);

const rule1 = {
  name: 'rule one',
  id: 'rule1',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      technique: [{ id: 'T1234', name: 'tactic one' }],
    },
  ],
};
const rule2 = {
  name: 'rule two',
  id: 'rule2',
};

const defaultRuleVersionsTriad = new Map<string, unknown>([
  ['rule1', { target: rule1 }],
  ['rule2', { target: rule2, current: rule2 }],
]);
const mockFetchRuleVersionsTriad = jest.fn().mockResolvedValue(defaultRuleVersionsTriad);
jest.mock(
  '../../../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad',
  () => ({
    fetchRuleVersionsTriad: () => mockFetchRuleVersionsTriad(),
  })
);

const splunkRule: SplunkRule = {
  title: 'splunk rule',
  description: 'splunk rule description',
  search: 'index=*',
  mitreAttackIds: ['T1234'],
};

const defaultParams = {
  soClient: savedObjectsClientMock.create(),
  rulesClient: rulesClientMock.create(),
  splunkRule,
};

describe('retrievePrebuiltRulesMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when prebuilt rule is installed', () => {
    it('should return isInstalled flag', async () => {
      const prebuiltRulesMap = await retrievePrebuiltRulesMap(defaultParams);
      expect(prebuiltRulesMap.size).toBe(2);
      expect(prebuiltRulesMap.get('rule one')).toEqual(
        expect.objectContaining({ isInstalled: false })
      );
      expect(prebuiltRulesMap.get('rule two')).toEqual(
        expect.objectContaining({ isInstalled: true })
      );
    });
  });

  describe('when splunk rule does not contain mitreAttackIds', () => {
    it('should return the full rules map', async () => {
      const prebuiltRulesMap = await retrievePrebuiltRulesMap({
        ...defaultParams,
        splunkRule: { ...splunkRule, mitreAttackIds: undefined },
      });
      expect(prebuiltRulesMap.size).toBe(2);
    });
  });

  describe('when splunk rule contains empty mitreAttackIds', () => {
    it('should return the full rules map', async () => {
      const prebuiltRulesMap = await retrievePrebuiltRulesMap({
        ...defaultParams,
        splunkRule: { ...splunkRule, mitreAttackIds: [] },
      });
      expect(prebuiltRulesMap.size).toBe(2);
    });
  });

  describe('when splunk rule contains non matching mitreAttackIds', () => {
    it('should return the full rules map', async () => {
      const prebuiltRulesMap = await retrievePrebuiltRulesMap({
        ...defaultParams,
        splunkRule: { ...splunkRule, mitreAttackIds: ['T2345'] },
      });
      expect(prebuiltRulesMap.size).toBe(1);
      expect(prebuiltRulesMap.get('rule two')).toEqual(expect.objectContaining({ rule: rule2 }));
    });
  });

  describe('when splunk rule contains matching mitreAttackIds', () => {
    it('should return the filtered rules map', async () => {
      const prebuiltRulesMap = await retrievePrebuiltRulesMap(defaultParams);
      expect(prebuiltRulesMap.size).toBe(2);
      expect(prebuiltRulesMap.get('rule one')).toEqual(expect.objectContaining({ rule: rule1 }));
      expect(prebuiltRulesMap.get('rule two')).toEqual(expect.objectContaining({ rule: rule2 }));
    });
  });
});
