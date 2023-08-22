/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { convertRulesFilterToKQL } from '../../../../../../../common/utils/kql';
import type {
  CoverageOverviewRequestBody,
  CoverageOverviewResponse,
} from '../../../../../../../common/api/detection_engine';
import {
  CoverageOverviewRuleSource,
  CoverageOverviewRuleActivity,
} from '../../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../../rule_schema';

type CoverageOverviewRuleParams = Pick<RuleParams, 'threat'>;

interface CoverageOverviewRouteDependencies {
  rulesClient: RulesClient;
}

interface HandleCoverageOverviewRequestArgs {
  params: CoverageOverviewRequestBody;
  deps: CoverageOverviewRouteDependencies;
}

export async function handleCoverageOverviewRequest({
  params: { filter },
  deps: { rulesClient },
}: HandleCoverageOverviewRequestArgs): Promise<CoverageOverviewResponse> {
  const activitySet = new Set(filter?.activity);
  const kqlFilter = filter
    ? convertRulesFilterToKQL({
        filter: filter.search_term,
        showCustomRules: filter.source?.includes(CoverageOverviewRuleSource.Custom) ?? false,
        showElasticRules: filter.source?.includes(CoverageOverviewRuleSource.Prebuilt) ?? false,
        enabled:
          (activitySet.has(CoverageOverviewRuleActivity.Enabled) &&
            activitySet.has(CoverageOverviewRuleActivity.Disabled)) ||
          (!activitySet.has(CoverageOverviewRuleActivity.Enabled) &&
            !activitySet.has(CoverageOverviewRuleActivity.Disabled))
            ? undefined
            : activitySet.has(CoverageOverviewRuleActivity.Enabled),
      })
    : undefined;

  // rulesClient.find uses ES Search API to fetch the rules. It has some limitations when the number of rules exceeds
  // index.max_result_window (set to 10K by default) Kibana fails. A proper way to handle it is via ES PIT API.
  // This way the endpoint handles max 10K rules for now while support for the higher number of rules will be addressed
  // in https://github.com/elastic/kibana/issues/160698
  const rules = await rulesClient.find<CoverageOverviewRuleParams>({
    options: {
      filter: kqlFilter,
      fields: ['name', 'enabled', 'params.threat'],
      page: 1,
      perPage: 10000,
    },
  });

  return rules.data.reduce(appendRuleToResponse, {
    coverage: {},
    unmapped_rule_ids: [],
    rules_data: {},
  } as CoverageOverviewResponse);
}

/**
 * Extracts rule's MITRE ATT&CK™ tactics, techniques and subtechniques
 *
 * @returns an array of MITRE ATT&CK™ tactics, techniques and subtechniques
 */
function extractRuleMitreCategories(rule: SanitizedRule<CoverageOverviewRuleParams>): string[] {
  if (!rule.params.threat) {
    return [];
  }

  // avoid duplications just in case data isn't valid in ES
  const categories = new Set<string>();

  for (const threatItem of rule.params.threat) {
    if (threatItem.framework !== 'MITRE ATT&CK') {
      // eslint-disable-next-line no-continue
      continue;
    }

    categories.add(threatItem.tactic.id);

    for (const technique of threatItem.technique ?? []) {
      categories.add(technique.id);

      for (const subtechnique of technique.subtechnique ?? []) {
        categories.add(subtechnique.id);
      }
    }
  }

  return Array.from(categories);
}

function appendRuleToResponse(
  response: CoverageOverviewResponse,
  rule: SanitizedRule<CoverageOverviewRuleParams>
): CoverageOverviewResponse {
  const categories = extractRuleMitreCategories(rule);

  for (const category of categories) {
    if (!response.coverage[category]) {
      response.coverage[category] = [rule.id];
    } else {
      response.coverage[category].push(rule.id);
    }
  }

  if (categories.length === 0) {
    response.unmapped_rule_ids.push(rule.id);
  }

  response.rules_data[rule.id] = {
    name: rule.name,
    activity: rule.enabled
      ? CoverageOverviewRuleActivity.Enabled
      : CoverageOverviewRuleActivity.Disabled,
  };

  return response;
}
