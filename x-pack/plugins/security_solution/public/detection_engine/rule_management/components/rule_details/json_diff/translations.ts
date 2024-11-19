/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXPAND_UNCHANGED_LINES = (linesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.expandHiddenDiffLinesLabel',
    {
      values: { linesCount },
      defaultMessage:
        'Expand {linesCount} unchanged {linesCount, plural, one {line} other {lines}}',
    }
  );

export const CURRENT_RULE_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.currentVersionLabel',
  {
    defaultMessage: 'Current rule',
  }
);

export const CURRENT_VERSION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.currentVersionDescriptionLabel',
  {
    defaultMessage: 'Shows currently installed rule',
  }
);

export const ELASTIC_UPDATE_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.elasticUpdateVersionLabel',
  {
    defaultMessage: 'Elastic update',
  }
);

export const UPDATED_VERSION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.updatedVersionDescriptionLabel',
  {
    defaultMessage: 'Shows rule that will be installed',
  }
);
