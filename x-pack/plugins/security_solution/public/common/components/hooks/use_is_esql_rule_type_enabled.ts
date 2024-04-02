/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useKibana } from '../../lib/kibana';

export const useIsEsqlRuleTypeEnabled = (): boolean => {
  const isEsqlSettingEnabled = useKibana().services.configSettings.ESQLEnabled;
  const isEsqlRuleTypeEnabled = !useIsExperimentalFeatureEnabled('esqlRulesDisabled');

  return isEsqlSettingEnabled && isEsqlRuleTypeEnabled;
};
