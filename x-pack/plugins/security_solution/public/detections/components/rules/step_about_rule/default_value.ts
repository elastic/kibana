/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AboutStepRule } from '../../../pages/detection_engine/rules/types';
import { fillEmptySeverityMappings } from '../../../pages/detection_engine/rules/helpers';

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
  isAssociatedToEndpointList: false,
  isBuildingBlock: false,
  isNew: true,
  severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
  riskScore: { value: 50, mapping: [], isMappingChecked: false },
  references: [''],
  falsePositives: [''],
  license: '',
  ruleNameOverride: '',
  tags: [],
  timestampOverride: '',
  threat: threatDefault,
  note: '',
};
