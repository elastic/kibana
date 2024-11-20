/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  ThreatArray,
  ThreatTechnique,
} from '../../../api/detection_engine/model/rule_schema';

export const extractThreatArray = (rule: RuleResponse): ThreatArray =>
  rule.threat.map((threat) => {
    if (threat.technique && threat.technique.length) {
      return { ...threat, technique: trimTechniqueArray(threat.technique) };
    }
    return { ...threat, technique: undefined }; // If `technique` is an empty array, remove the field from the `threat` object
  });

const trimTechniqueArray = (techniqueArray: ThreatTechnique[]): ThreatTechnique[] => {
  return techniqueArray.map((technique) => ({
    ...technique,
    subtechnique:
      technique.subtechnique && technique.subtechnique.length ? technique.subtechnique : undefined, // If `subtechnique` is an empty array, remove the field from the `technique` object
  }));
};
