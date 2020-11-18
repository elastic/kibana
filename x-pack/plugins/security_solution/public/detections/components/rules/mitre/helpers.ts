/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';
import { FieldHook } from 'src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { subtechniquesOptions } from '../../../mitre/mitre_tactics_techniques';

import { IMitreAttackTechnique } from '../../../pages/detection_engine/rules/types';

export const isMitreAttackInvalid = (
  tacticName: string | null | undefined,
  technique: IMitreAttackTechnique[] | null | undefined
) => {
  if (
    tacticName !== 'none' &&
    technique != null &&
    (isEmpty(technique) || !containsTechniques(technique))
  ) {
    return true;
  }
  return false;
};

export const isMitreTechniqueInvalid = (
  tacticName: string | null | undefined,
  technique: IMitreAttackTechnique | null | undefined
) => {
  if (
    tacticName !== 'none' &&
    technique != null &&
    hasSubtechniqueOptions(technique) === true &&
    technique.subtechnique != null &&
    (technique.subtechnique.length === 0 || !containsSubtechniques(technique))
  ) {
    return true;
  }
  return false;
};

const containsTechniques = (techniques: IMitreAttackTechnique[]) => {
  return techniques.some((technique) => technique.name !== 'none');
};

const containsSubtechniques = (technique: IMitreAttackTechnique) => {
  return (
    technique.subtechnique != null &&
    technique.subtechnique.some((subtechnique) => subtechnique.name !== 'none')
  );
};

/**
 * Returns true if the given mitre technique has any subtechniques
 */
export const hasSubtechniqueOptions = (technique: IMitreAttackTechnique) => {
  return subtechniquesOptions.some((subtechnique) => subtechnique.techniqueId === technique.id);
};

/**
 * Returns an object with all applicable error messages for the given field param
 */
export const getMitreErrorMessages = (field: FieldHook) => {
  if (field.isChangingValue || !field.errors.length) {
    return {};
  }
  return {
    tacticError: field.errors.reduce((acc: string[], error) => {
      if (error.path === 'threat.tactic') {
        acc.push(error.message);
      }
      return acc;
    }, []),
    techniqueError: field.errors.reduce((acc: string[], error) => {
      if (error.path === 'threat.technique') {
        acc.push(error.message);
      }
      return acc;
    }, []),
  };
};
