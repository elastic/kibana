/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/keys';

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { AppFeaturesService } from '../lib/app_features_service/app_features_service';

/**
 * enable rule actions based on AppFeature Config
 */
export const enableRuleActions = ({
  actions,
  appFeatures,
}: {
  actions: ActionsPluginSetupContract;
  appFeatures: AppFeaturesService;
}) => {
  if (appFeatures.isEnabled(AppFeatureSecurityKey.externalRuleActions)) {
    actions.setEnabledConnectorTypes(['*']);
  } else {
    actions.setEnabledConnectorTypes(['.email', '.slack', '.index']);
  }
};
