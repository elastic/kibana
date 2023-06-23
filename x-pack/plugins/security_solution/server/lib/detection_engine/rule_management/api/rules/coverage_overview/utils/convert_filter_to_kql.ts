/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewFilter } from '../../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import { convertEnabledStatusToKQL } from './convert_enabled_status_to_kql';
import { convertSearchTermToKQL } from './convert_search_term_to_kql';
import { convertSourceToKQL } from './convert_source_to_kql';

export function convertFilterToKQL(filter: CoverageOverviewFilter): string {
  const kql: string[] = [];

  if (filter.search_term) {
    kql.push(convertSearchTermToKQL(filter.search_term));
  }

  const activity = new Set(filter.activity);

  // Handle only existing rules in the first implementation
  // which means available rules are out of the context for now
  if (
    activity.has(CoverageOverviewRuleActivity.Enabled) &&
    activity.has(CoverageOverviewRuleActivity.Disabled)
  ) {
    // if both enabled and disabled rules are requested the query shouldn't be modified as the result includes such rules by default
  } else if (activity.has(CoverageOverviewRuleActivity.Enabled)) {
    kql.push(convertEnabledStatusToKQL(true));
  } else if (activity.has(CoverageOverviewRuleActivity.Disabled)) {
    kql.push(convertEnabledStatusToKQL(false));
  }

  const source = new Set(filter.source);

  // Handle only custom and prebuilt rules
  // customized rules will be supported after rule customization feature is ready
  if (
    source.has(CoverageOverviewRuleSource.Custom) &&
    source.has(CoverageOverviewRuleSource.Prebuilt)
  ) {
    // if all the filter flags set it means all the rules should be returned, as returning all the rules the default
    // behavior this query part can be omitted
  } else if (source.has(CoverageOverviewRuleSource.Custom)) {
    kql.push(convertSourceToKQL('custom'));
  } else if (source.has(CoverageOverviewRuleSource.Prebuilt)) {
    kql.push(convertSourceToKQL('prebuilt'));
  }

  return kql.join(' AND ');
}
