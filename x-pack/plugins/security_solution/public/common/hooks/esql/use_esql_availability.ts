/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';

export const useEsqlAvailability = () => {
  const { uiSettings } = useKibana().services;
  const isEsqlAdvancedSettingEnabled = uiSettings?.get('discover:enableESQL');
  const isEsqlRuleTypeEnabled =
    !useIsExperimentalFeatureEnabled('esqlRulesDisabled') && isEsqlAdvancedSettingEnabled;
  const isESQLTabInTimelineEnabled =
    !useIsExperimentalFeatureEnabled('timelineEsqlTabDisabled') && isEsqlAdvancedSettingEnabled;

  return useMemo(
    () => ({
      isEsqlAdvancedSettingEnabled,
      isEsqlRuleTypeEnabled,
      isESQLTabInTimelineEnabled,
    }),
    [isESQLTabInTimelineEnabled, isEsqlAdvancedSettingEnabled, isEsqlRuleTypeEnabled]
  );
};
