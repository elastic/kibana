/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const elementsOverlap = ($element1: JQuery<HTMLElement>, $element2: JQuery<HTMLElement>) => {
  const rectA = $element1[0].getBoundingClientRect();
  const rectB = $element2[0].getBoundingClientRect();

  // If they don't overlap horizontally, they don't overlap
  if (rectA.right < rectB.left || rectB.right < rectA.left) {
    return false;
  } else if (rectA.bottom < rectB.top || rectB.bottom < rectA.top) {
    // If they don't overlap vertically, they don't overlap
    return false;
  } else {
    return true;
  }
};
