/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrePackagedTimelineInstallationStatus } from '../../../detections/pages/detection_engine/rules/helpers';
import { usePrePackagedRulesStatus } from './use_pre_packaged_rules_status';

export const usePrePackagedTimelinesInstallationStatus = () => {
  const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();

  return getPrePackagedTimelineInstallationStatus(
    prePackagedRulesStatus?.timelines_installed,
    prePackagedRulesStatus?.timelines_not_installed,
    prePackagedRulesStatus?.timelines_not_updated
  );
};
