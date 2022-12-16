/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { PrebuiltRuleVersionInfo } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';
import { convertLegacyVersionToSemantic } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/semantic_version';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';

import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/normalization/rule_converters';

export interface IPrebuiltRuleObjectsClient {
  fetchInstalledVersions(): Promise<PrebuiltRuleVersionInfo[]>;
  fetchInstalledRules(): Promise<FetchInstalledRulesResult>;
}

export interface FetchInstalledRulesResult {
  installedVersions: PrebuiltRuleVersionInfo[];
  installedRules: RuleResponse[];
}

export const createPrebuiltRuleObjectsClient = (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): IPrebuiltRuleObjectsClient => {
  const fetchInstalledVersions = (): Promise<PrebuiltRuleVersionInfo[]> => {
    return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledVersions', async () => {
      const rulesData = await getExistingPrepackagedRules({ rulesClient });
      const rules = rulesData.map((rule) => internalRuleToAPIResponse(rule));
      const versions = rules.map((rule) => convertRuleToVersionInfo(rule));
      return versions;
    });
  };

  const fetchInstalledRules = (): Promise<FetchInstalledRulesResult> => {
    return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRules', async () => {
      const rulesData = await getExistingPrepackagedRules({ rulesClient });
      const rules = rulesData.map((rule) => internalRuleToAPIResponse(rule));
      const versions = rules.map((rule) => convertRuleToVersionInfo(rule));
      return {
        installedVersions: versions,
        installedRules: rules,
      };
    });
  };

  return {
    fetchInstalledVersions,
    fetchInstalledRules,
  };
};

const convertRuleToVersionInfo = (rule: RuleResponse): PrebuiltRuleVersionInfo => {
  const versionInfo: PrebuiltRuleVersionInfo = {
    rule_id: rule.rule_id,
    rule_content_version: convertLegacyVersionToSemantic(rule.version),
    stack_version_min: '',
    stack_version_max: '',
  };
  return versionInfo;
};
