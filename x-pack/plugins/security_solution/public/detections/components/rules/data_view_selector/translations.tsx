/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PICK_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.stepDefineRule.pickDataView',
  {
    defaultMessage: 'Select a Data View',
  }
);

export const DATA_VIEW_NOT_FOUND_WARNING_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.stepDefineRule.dataViewNotFoundLabel',
  {
    defaultMessage: 'Selected data view not found',
  }
);

export const DATA_VIEW_NOT_FOUND_WARNING_DESCRIPTION = (dataView: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.stepDefineRule.dataViewNotFoundDescription',
    {
      values: { dataView },
      defaultMessage:
        'Your data view of "id": "{dataView}" was not found. It could be that it has since been deleted.',
    }
  );
