/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { useKibana } from '../../lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';

/**
 * This hook combines the checks for esql availability within the security solution
 * If the advanced setting is disabled, ESQL will not be accessible in the UI for any new timeline or new rule creation workflows
 * The feature flags are still available to provide users an escape hatch in case of any esql related performance issues
 */
export const useEsqlAvailability = () => {
  const { uiSettings } = useKibana().services;
  const isEsqlAdvancedSettingEnabled = uiSettings?.get(ENABLE_ESQL);

  const isTimelineEsqlFeatureFlagDisabled =
    useIsExperimentalFeatureEnabled('timelineEsqlTabDisabled');

  const isEsqlRuleTypeEnabled =
    !useIsExperimentalFeatureEnabled('esqlRulesDisabled') && isEsqlAdvancedSettingEnabled;

  return useMemo(
    () => ({
      isEsqlAdvancedSettingEnabled,
      isEsqlRuleTypeEnabled,
      isTimelineEsqlEnabledByFeatureFlag: !isTimelineEsqlFeatureFlagDisabled,
    }),
    [isEsqlAdvancedSettingEnabled, isTimelineEsqlFeatureFlagDisabled, isEsqlRuleTypeEnabled]
  );
};
