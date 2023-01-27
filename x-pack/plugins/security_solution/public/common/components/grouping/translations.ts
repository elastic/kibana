/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GROUPS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.grouping.total.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {group} other {groups}}`,
  });

export const TAKE_ACTION = i18n.translate(
  'xpack.securitySolution.grouping.additionalActions.takeAction',
  {
    defaultMessage: 'Take actions',
  }
);

export const TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.grouping.technicalPreviewLabel',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const GROUP_BY = i18n.translate('xpack.securitySolution.selector.grouping.label', {
  defaultMessage: 'Group by field',
});
