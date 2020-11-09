/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TACTIC = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.tacticsDescription',
  {
    defaultMessage: 'tactic',
  }
);

export const TECHNIQUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.techniquesDescription',
  {
    defaultMessage: 'techniques',
  }
);

export const ADD_MITRE_ATTACK = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.addTitle',
  {
    defaultMessage: 'Add MITRE ATT&CK\\u2122 threat',
  }
);

export const TECHNIQUES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.techniquesPlaceHolderDescription',
  {
    defaultMessage: 'Select techniques ...',
  }
);

export const TACTIC_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.tacticPlaceHolderDescription',
  {
    defaultMessage: 'Select tactic ...',
  }
);
