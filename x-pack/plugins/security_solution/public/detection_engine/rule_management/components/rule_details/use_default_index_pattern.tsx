/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

/**
 * Gets the default index pattern for cases when rule has neither index patterns or data view.
 * First checks the config value. If it's not present falls back to the hardcoded default value.
 */
export function useDefaultIndexPattern() {
  const { services } = useKibana();
  const isPrebuiltRulesCustomizationEnabled = useIsExperimentalFeatureEnabled(
    'prebuiltRulesCustomizationEnabled'
  );

  if (isPrebuiltRulesCustomizationEnabled) {
    return services.settings.client.get(DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN);
  }

  return [];
}
