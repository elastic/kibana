/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ruleSwitchAriaLabel = (name: string, isActive: boolean) =>
  i18n.translate('xpack.securitySolution.ruleDetails.ruleSwitch.ariaLabel', {
    values: {
      name,
      action: isActive
        ? i18n.translate('xpack.securitySolution.ruleDetails.ruleSwitch.ariaLabel.switchOff', {
            defaultMessage: 'Switch off',
          })
        : i18n.translate('xpack.securitySolution.ruleDetails.ruleSwitch.ariaLabel.switchOn', {
            defaultMessage: 'Switch on',
          }),
    },
    defaultMessage: '{action} "{name}"',
  });
