/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Threat } from '../../../common/detection_engine/schemas/common/schemas';
import { mockThreatData } from './mitre_tactics_techniques';

const { tactic, technique, subtechnique } = mockThreatData;
const { tactics, ...mockTechnique } = technique;
const { tactics: subtechniqueTactics, ...mockSubtechnique } = subtechnique;

export const getValidThreat = (): Threat => [
  {
    framework: 'MITRE ATT&CK',
    tactic,
    technique: [
      {
        ...mockTechnique,
        subtechnique: [mockSubtechnique],
      },
    ],
  },
];
