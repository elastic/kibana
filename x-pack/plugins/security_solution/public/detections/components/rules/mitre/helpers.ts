/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { subtechniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import { IMitreAttackTechnique } from '../../../pages/detection_engine/rules/types';

/**
 * Returns true if the given mitre technique has any subtechniques
 */
export const hasSubtechniqueOptions = (technique: IMitreAttackTechnique) => {
  return subtechniquesOptions.some((subtechnique) => subtechnique.techniqueId === technique.id);
};
