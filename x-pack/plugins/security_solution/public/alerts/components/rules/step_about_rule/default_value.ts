/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AboutStepRule } from '../../../pages/detection_engine/rules/types';

export const threatDefault = [
  {
    framework: 'MITRE ATT&CK',
    tactic: { id: 'none', name: 'none', reference: 'none' },
    technique: [],
  },
];

export const stepAboutDefaultValue: AboutStepRule = {
  author: [],
  name: '',
  description: '',
  isBuildingBlock: false,
  isNew: true,
  severity: { value: 'low', mapping: [] },
  riskScore: { value: 50, mapping: [] },
  references: [''],
  falsePositives: [''],
  license: '',
  ruleNameOverride: '',
  tags: [],
  timestampOverride: '',
  threat: threatDefault,
  note: '',
};
