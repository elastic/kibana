/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const insufficientLicenseLevel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.components.flyoutDrilldownWizard.insufficientLicenseLevelError',
  {
    defaultMessage: 'Insufficient license level',
    description:
      'User created drilldown with higher license type, but then downgraded the license. This error is shown in the list near created drilldown',
  }
);

export const invalidDrilldownType = (type: string) =>
  i18n.translate(
    'xpack.uiActionsEnhanced.drilldowns.components.flyoutDrilldownWizard.invalidDrilldownType',
    {
      defaultMessage: "Drilldown type {type} doesn't exist",
      values: {
        type,
      },
    }
  );
