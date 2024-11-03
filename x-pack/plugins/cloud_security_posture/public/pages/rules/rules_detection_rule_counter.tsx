/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import type { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { getFindingsDetectionRuleSearchTags } from '../../../common/utils/detection_rules';
import { DetectionRuleCounter } from '../../components/detection_rule_counter';
import { createDetectionRuleFromBenchmarkRule } from '../configurations/utils/create_detection_rule_from_benchmark';

export const RulesDetectionRuleCounter = ({
  benchmarkRule,
}: {
  benchmarkRule: CspBenchmarkRule['metadata'];
}) => {
  const createBenchmarkRuleFn = async (http: HttpSetup) =>
    await createDetectionRuleFromBenchmarkRule(http, benchmarkRule);

  return (
    <DetectionRuleCounter
      tags={getFindingsDetectionRuleSearchTags(benchmarkRule)}
      createRuleFn={createBenchmarkRuleFn}
    />
  );
};
