/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatTechnique } from '@kbn/securitysolution-io-ts-alerting-types';

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../mitre/mitre_tactics_techniques'
  );
};

/**
 * Returns true if the given mitre technique has any subtechniques
 */
export const hasSubtechniqueOptions = async (technique: ThreatTechnique) => {
  return (await lazyMitreConfiguration()).subtechniquesOptions.some(
    (subtechnique) => subtechnique.techniqueId === technique.id
  );
};
