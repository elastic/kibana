/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';
import { subtechniquesOptions } from '../../../mitre/mitre_tactics_techniques';

import { IMitreAttackTechnique } from '../../../pages/detection_engine/rules/types';

export const isMitreAttackInvalid = (
  tacticName: string | null | undefined,
  technique: IMitreAttackTechnique[]
) => {
  if (tacticName !== 'none' && (isEmpty(technique) || !containsTechniques(technique))) {
    return true;
  }
  return false;
};

export const isMitreTechniqueInvalid = (
  tacticName: string | null | undefined,
  technique: IMitreAttackTechnique | null | undefined
) => {
  if (
    isEmpty(tacticName) ||
    (tacticName !== 'none' && isEmpty(technique)) ||
    (technique != null &&
      hasSubtechniqueOptions(technique) === true &&
      (technique.subtechnique.length === 0 || !containsSubtechniques(technique)))
  ) {
    return true;
  }
  return false;
};

const containsTechniques = (techniques: IMitreAttackTechnique[]) => {
  return techniques.some((technique) => technique.name !== 'none');
};

const containsSubtechniques = (technique: IMitreAttackTechnique) => {
  return technique.subtechnique.some((subtechnique) => subtechnique.name !== 'none');
};

/**
 * Returns true if the given mitre technique has any subtechniques
 */
export const hasSubtechniqueOptions = (technique: IMitreAttackTechnique) => {
  return subtechniquesOptions.some((subtechnique) => subtechnique.techniqueId === technique.id);
};
