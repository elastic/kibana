/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const txtCreateDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.components.ListManageDrilldowns.createDrilldownButtonLabel',
  {
    defaultMessage: 'Create new',
  }
);

export const txtEditDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.components.ListManageDrilldowns.editDrilldownButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

export const txtDeleteDrilldowns = (count: number) =>
  i18n.translate(
    'xpack.uiActionsEnhanced.drilldowns.components.ListManageDrilldowns.deleteDrilldownsButtonLabel',
    {
      defaultMessage: 'Delete ({count})',
      values: {
        count,
      },
    }
  );

export const txtSelectDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.components.ListManageDrilldowns.selectThisDrilldownCheckboxLabel',
  {
    defaultMessage: 'Select this drilldown',
  }
);
