/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASE_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.baseVersionLabel',
  {
    defaultMessage: 'Original',
  }
);

export const CURRENT_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.currentVersionLabel',
  {
    defaultMessage: 'Current',
  }
);

export const TARGET_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.targetVersionLabel',
  {
    defaultMessage: 'Elastic update',
  }
);

export const FINAL_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.finalVersionLabel',
  {
    defaultMessage: 'Final',
  }
);

export const BASE_VS_TARGET = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.baseVsTargetLabel',
  {
    defaultMessage: '{base} vs {target}',
    values: {
      base: BASE_VERSION,
      target: TARGET_VERSION,
    },
  }
);

export const BASE_VS_CURRENT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.baseVsCurrentLabel',
  {
    defaultMessage: '{base} vs {current}',
    values: {
      base: BASE_VERSION,
      current: CURRENT_VERSION,
    },
  }
);

export const BASE_VS_FINAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.baseVsFinalLabel',
  {
    defaultMessage: '{base} vs {final}',
    values: {
      base: BASE_VERSION,
      final: FINAL_VERSION,
    },
  }
);

export const CURRENT_VS_TARGET = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.currentVsTargetLabel',
  {
    defaultMessage: '{current} vs {target}',
    values: {
      current: CURRENT_VERSION,
      target: TARGET_VERSION,
    },
  }
);

export const CURRENT_VS_FINAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.currentVsFinalLabel',
  {
    defaultMessage: '{current} vs {final}',
    values: {
      current: CURRENT_VERSION,
      final: FINAL_VERSION,
    },
  }
);

export const TARGET_VS_FINAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.targetVsFinalLabel',
  {
    defaultMessage: '{target} vs {final}',
    values: {
      target: TARGET_VERSION,
      final: FINAL_VERSION,
    },
  }
);

export const VERSION_PICKER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.ariaLabel',
  {
    defaultMessage: 'Select versions to compare',
  }
);
