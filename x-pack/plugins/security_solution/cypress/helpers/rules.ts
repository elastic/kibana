/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Mitre } from '../objects/rule';

export const formatMitreAttackDescription = (mitre: Mitre[]) => {
  return mitre
    .map(
      (threat) =>
        threat.tactic +
        threat.techniques
          .map((technique) => {
            return technique.name + technique.subtechniques.join('');
          })
          .join('')
    )
    .join('');
};
