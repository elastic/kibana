/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { PrebuiltRulesMapByName } from './prebuilt_rules';
import { filterPrebuiltRules, retrievePrebuiltRulesMap } from './prebuilt_rules';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

jest.mock(
  '../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client',
  () => ({ createPrebuiltRuleObjectsClient: jest.fn() })
);
jest.mock(
  '../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client',
  () => ({ createPrebuiltRuleAssetsClient: jest.fn() })
);

const mitreAttackIds = 'T1234';
const rule1 = {
  name: 'rule one',
  id: 'rule1',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      technique: [{ id: mitreAttackIds, name: 'tactic one' }],
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
  '../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad',
  () => ({
    fetchRuleVersionsTriad: () => mockFetchRuleVersionsTriad(),
  })
);

const defaultParams = {
  soClient: savedObjectsClientMock.create(),
  rulesClient: rulesClientMock.create(),
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
        expect.objectContaining({ installedRuleId: undefined })
      );
      expect(prebuiltRulesMap.get('rule two')).toEqual(
        expect.objectContaining({ installedRuleId: rule2.id })
      );
    });
  });
});

describe('filterPrebuiltRules', () => {
  let prebuiltRulesMap: PrebuiltRulesMapByName;

  beforeEach(async () => {
    prebuiltRulesMap = await retrievePrebuiltRulesMap(defaultParams);
    jest.clearAllMocks();
  });

  describe('when splunk rule contains empty mitreAttackIds', () => {
    it('should return empty rules map', async () => {
      const filteredPrebuiltRules = filterPrebuiltRules(prebuiltRulesMap, []);
      expect(filteredPrebuiltRules.size).toBe(0);
    });
  });

  describe('when splunk rule does not match mitreAttackIds', () => {
    it('should return empty rules map', async () => {
      const filteredPrebuiltRules = filterPrebuiltRules(prebuiltRulesMap, [`${mitreAttackIds}_2`]);
      expect(filteredPrebuiltRules.size).toBe(0);
    });
  });

  describe('when splunk rule contains matching mitreAttackIds', () => {
    it('should return the filtered rules map', async () => {
      const filteredPrebuiltRules = filterPrebuiltRules(prebuiltRulesMap, [mitreAttackIds]);
      expect(filteredPrebuiltRules.size).toBe(1);
      expect(filteredPrebuiltRules.get('rule one')).toEqual(
        expect.objectContaining({ rule: rule1 })
      );
    });
  });
});
