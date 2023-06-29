/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import type {
  CoverageOverviewResponse,
  CoverageOverviewRuleAttributes,
} from '../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/response_schema';
import {
  subtechniques,
  tactics,
  technique as techniques,
} from '../../../../detections/mitre/mitre_tactics_techniques';
import type { CoverageOverviewDashboard } from '../../model/coverage_overview/dashboard';
import type { CoverageOverviewRule } from '../../model/coverage_overview/rule';
import { buildCoverageOverviewMitreGraph } from './build_coverage_overview_mitre_graph';

export function buildCoverageOverviewDashboardModel(
  apiResponse: CoverageOverviewResponse
): CoverageOverviewDashboard {
  const mitreTactics = buildCoverageOverviewMitreGraph(tactics, techniques, subtechniques);

  for (const tactic of mitreTactics) {
    for (const ruleId of apiResponse.coverage[tactic.id] ?? []) {
      addRule(tactic, ruleId, apiResponse.rules_data[ruleId]);
    }

    for (const technique of tactic.techniques) {
      for (const ruleId of apiResponse.coverage[technique.id] ?? []) {
        addRule(technique, ruleId, apiResponse.rules_data[ruleId]);
      }

      for (const subtechnique of technique.subtechniques) {
        for (const ruleId of apiResponse.coverage[subtechnique.id] ?? []) {
          addRule(subtechnique, ruleId, apiResponse.rules_data[ruleId]);
        }
      }
    }
  }

  return {
    mitreTactics,
    unmappedRules: buildUnmapedRules(apiResponse),
    metrics: calcMetrics(apiResponse.rules_data),
  };
}

function calcMetrics(
  rulesData: Record<string, CoverageOverviewRuleAttributes>
): CoverageOverviewDashboard['metrics'] {
  const ruleIds = Object.keys(rulesData);
  const metrics: CoverageOverviewDashboard['metrics'] = {
    totalRulesCount: ruleIds.length,
    totalEnabledRulesCount: 0,
  };

  for (const ruleId of Object.keys(rulesData)) {
    if (rulesData[ruleId].activity === CoverageOverviewRuleActivity.Enabled) {
      metrics.totalEnabledRulesCount++;
    }
  }

  return metrics;
}

function buildUnmapedRules(
  apiResponse: CoverageOverviewResponse
): CoverageOverviewDashboard['unmappedRules'] {
  const unmappedRules: CoverageOverviewDashboard['unmappedRules'] = {
    enabledRules: [],
    disabledRules: [],
    availableRules: [],
  };

  for (const ruleId of apiResponse.unmapped_rule_ids) {
    addRule(unmappedRules, ruleId, apiResponse.rules_data[ruleId]);
  }

  return unmappedRules;
}

function addRule(
  container: {
    enabledRules: CoverageOverviewRule[];
    disabledRules: CoverageOverviewRule[];
    availableRules: CoverageOverviewRule[];
  },
  ruleId: string,
  ruleData: CoverageOverviewRuleAttributes
): void {
  if (!ruleData) {
    return;
  }

  if (ruleData.activity === CoverageOverviewRuleActivity.Enabled) {
    container.enabledRules.push({
      id: ruleId,
      name: ruleData.name,
    });
  } else if (ruleData.activity === CoverageOverviewRuleActivity.Disabled) {
    container.disabledRules.push({
      id: ruleId,
      name: ruleData.name,
    });
  }
}
