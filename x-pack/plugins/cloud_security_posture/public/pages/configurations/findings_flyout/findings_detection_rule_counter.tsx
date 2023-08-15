/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { DetectionRuleCounter } from '../../../components/detection_rule_counter';

export const FindingsDetectionRuleCounter = ({ finding }: { finding: CspFinding }) => {
  return <DetectionRuleCounter tags={finding.rule.tags} />;
};
