/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Filter } from '@kbn/es-query';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  buildShowBuildingBlockFilter,
  buildShowBuildingBlockFilterRuleRegistry,
} from '../../../detections/components/alerts_table/default_config';

// On the Overview page, in the Detection Alert Trend, we never show
// "building block" alerts to remove noise from the Overview UI.
// https://www.elastic.co/guide/en/security/current/building-block-rule.html
const SHOW_BUILDING_BLOCK_ALERTS = false;

export const useFiltersForSignalsByCategory = (baseFilters: Filter[]) => {
  // TODO: Once we are past experimental phase this code should be removed
  const ruleRegistryEnabled = useIsExperimentalFeatureEnabled('ruleRegistryEnabled');

  const resultingFilters = useMemo(
    () => [
      ...baseFilters,
      ...(ruleRegistryEnabled
        ? buildShowBuildingBlockFilterRuleRegistry(SHOW_BUILDING_BLOCK_ALERTS) // TODO: Once we are past experimental phase this code should be removed
        : buildShowBuildingBlockFilter(SHOW_BUILDING_BLOCK_ALERTS)),
    ],
    [baseFilters, ruleRegistryEnabled]
  );

  return resultingFilters;
};
