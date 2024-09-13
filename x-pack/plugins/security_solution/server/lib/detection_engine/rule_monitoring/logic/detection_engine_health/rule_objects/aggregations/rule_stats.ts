/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  HealthOverviewState,
  TotalEnabledDisabled,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RawData } from '../../../utils/normalization';

export const getRuleStatsAggregation = (): Record<
  string,
  estypes.AggregationsAggregationContainer
> => {
  const rulesByEnabled: estypes.AggregationsAggregationContainer = {
    terms: {
      field: 'alert.attributes.enabled',
    },
  };

  return {
    rulesByEnabled,
    rulesByOrigin: {
      terms: {
        field: 'alert.attributes.params.immutable',
      },
      aggs: {
        rulesByEnabled,
      },
    },
    rulesByType: {
      terms: {
        field: 'alert.attributes.alertTypeId',
      },
      aggs: {
        rulesByEnabled,
      },
    },
    rulesByOutcome: {
      terms: {
        field: 'alert.attributes.lastRun.outcome',
      },
      aggs: {
        rulesByEnabled,
      },
    },
  };
};

export const normalizeRuleStatsAggregation = (
  aggregations: Record<string, RawData>
): HealthOverviewState => {
  const rulesByEnabled = aggregations.rulesByEnabled || {};
  const rulesByOrigin = aggregations.rulesByOrigin || {};
  const rulesByType = aggregations.rulesByType || {};
  const rulesByOutcome = aggregations.rulesByOutcome || {};

  return {
    number_of_rules: {
      all: normalizeByEnabled(rulesByEnabled),
      by_origin: normalizeByOrigin(rulesByOrigin),
      by_type: normalizeByAnyKeyword(rulesByType),
      by_outcome: normalizeByAnyKeyword(rulesByOutcome),
    },
  };
};

const normalizeByEnabled = (rulesByEnabled: RawData): TotalEnabledDisabled => {
  const getEnabled = (value: 'true' | 'false'): number => {
    const bucket = rulesByEnabled?.buckets?.find((b: RawData) => b.key_as_string === value);
    return Number(bucket?.doc_count || 0);
  };

  const enabled = getEnabled('true');
  const disabled = getEnabled('false');

  return {
    total: enabled + disabled,
    enabled,
    disabled,
  };
};

const normalizeByOrigin = (
  rulesByOrigin: RawData
): Record<'prebuilt' | 'custom', TotalEnabledDisabled> => {
  const getOrigin = (value: 'true' | 'false'): TotalEnabledDisabled => {
    const bucket = rulesByOrigin?.buckets?.find((b: RawData) => b.key === value);
    return normalizeByEnabled(bucket?.rulesByEnabled);
  };

  const prebuilt = getOrigin('true');
  const custom = getOrigin('false');

  return { prebuilt, custom };
};

const normalizeByAnyKeyword = (
  rulesByAnyKeyword: RawData
): Record<string, TotalEnabledDisabled> => {
  const kvPairs = rulesByAnyKeyword?.buckets?.map((b: RawData) => {
    const bucketKey = b.key;
    const rulesByEnabled = b?.rulesByEnabled || {};
    return {
      [bucketKey]: normalizeByEnabled(rulesByEnabled),
    };
  });

  return Object.assign({}, ...kvPairs);
};
