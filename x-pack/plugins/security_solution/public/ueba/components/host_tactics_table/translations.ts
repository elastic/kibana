/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COUNT = (totalCount: number, techniqueCount: number) =>
  i18n.translate('xpack.securitySolution.uebaTableHostTactics.tacticTechnique', {
    values: { techniqueCount, totalCount },
    defaultMessage: `{totalCount} {totalCount, plural, =1 {tactic} other {tactics}} with {techniqueCount} {techniqueCount, plural, =1 {technique} other {techniques}}`,
  });

export const TACTIC = i18n.translate('xpack.securitySolution.uebaTableHostTactics.tactic', {
  defaultMessage: 'Tactic',
});

export const RISK_SCORE = i18n.translate(
  'xpack.securitySolution.uebaTableHostTactics.totalRiskScore',
  {
    defaultMessage: 'Total risk score',
  }
);

export const TECHNIQUE = i18n.translate('xpack.securitySolution.uebaTableHostTactics.technique', {
  defaultMessage: 'Technique',
});

export const HITS = i18n.translate('xpack.securitySolution.uebaTableHostTactics.hits', {
  defaultMessage: 'Number of hits',
});
