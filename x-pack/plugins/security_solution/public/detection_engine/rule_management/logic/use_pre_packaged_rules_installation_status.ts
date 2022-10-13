/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrePackagedRuleInstallationStatus } from '../../../detections/pages/detection_engine/rules/helpers';
import { usePrePackagedRulesStatus } from './use_pre_packaged_rules_status';

export const usePrePackagedRulesInstallationStatus = () => {
  const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();

  return getPrePackagedRuleInstallationStatus(
    prePackagedRulesStatus?.rulesInstalled,
    prePackagedRulesStatus?.rulesNotInstalled,
    prePackagedRulesStatus?.rulesNotUpdated
  );
};
