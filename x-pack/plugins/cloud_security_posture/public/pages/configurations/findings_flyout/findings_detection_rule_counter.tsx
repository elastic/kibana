/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { DetectionRuleCounter } from '../../../components/detection_rule_counter';
import { getFindingsDetectionRuleSearchTags } from '../../../../common/utils/detection_rules';
import { createDetectionRuleFromBenchmarkRule } from '../utils/create_detection_rule_from_benchmark';

export const FindingsDetectionRuleCounter = ({ finding }: { finding: CspFinding }) => {
  const createMisconfigurationRuleFn = async (http: HttpSetup) =>
    await createDetectionRuleFromBenchmarkRule(http, finding.rule);

  return (
    <DetectionRuleCounter
      tags={getFindingsDetectionRuleSearchTags(finding.rule)}
      createRuleFn={createMisconfigurationRuleFn}
    />
  );
};
