/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Threats } from '../../../common/detection_engine/schemas/common/schemas';
import { mockThreatData } from './mitre_tactics_techniques';

const { tactic, technique, subtechnique } = mockThreatData;
const { tactics, ...mockTechnique } = technique;
const { tactics: subtechniqueTactics, ...mockSubtechnique } = subtechnique;

export const getValidThreat = (): Threats => [
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
