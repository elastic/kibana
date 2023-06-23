/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { CoverageOverviewRequestBody } from '../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import { CoverageOverviewRuleActivity } from '../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import type { CoverageOverviewResponse } from '../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/response_schema';
import type { RuleParams } from '../../../../rule_schema';
import { convertFilterToKQL } from './utils/convert_filter_to_kql';

type CoverageOverviewRuleParams = Pick<RuleParams, 'threat'>;

interface CoverageOverviewRouteDependencies {
  rulesClient: RulesClient;
}

interface HandleCoverageOverviewRequestArgs {
  resolveParameters: () => CoverageOverviewRequestBody;
  resolveDependencies: () => Promise<CoverageOverviewRouteDependencies>;
}

export async function handleCoverageOverviewRequest({
  resolveParameters,
  resolveDependencies,
}: HandleCoverageOverviewRequestArgs): Promise<CoverageOverviewResponse> {
  const { filter } = resolveParameters();
  const { rulesClient } = await resolveDependencies();

  const rules = await rulesClient.find<CoverageOverviewRuleParams>({
    options: {
      filter: filter ? convertFilterToKQL(filter) : undefined,
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
