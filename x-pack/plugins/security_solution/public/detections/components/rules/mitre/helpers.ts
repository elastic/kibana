/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatTechnique } from '../../../../../common/detection_engine/schemas/common/schemas';
import { subtechniquesOptions } from '../../../mitre/mitre_tactics_techniques';

/**
 * Returns true if the given mitre technique has any subtechniques
 */
export const hasSubtechniqueOptions = (technique: ThreatTechnique) => {
  return subtechniquesOptions.some((subtechnique) => subtechnique.techniqueId === technique.id);
};
