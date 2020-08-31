/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_TIMELINE = i18n.translate('xpack.securitySolution.dragAndDrop.addToTimeline', {
  defaultMessage: 'Add to timeline investigation',
});

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.dragAndDrop.copyToClipboardTooltip',
  {
    defaultMessage: 'Copy to Clipboard',
  }
);

export const FIELD = i18n.translate('xpack.securitySolution.dragAndDrop.fieldLabel', {
  defaultMessage: 'Field',
});

export const FILTER_FOR_VALUE = i18n.translate(
  'xpack.securitySolution.dragAndDrop.filterForValueHoverAction',
  {
    defaultMessage: 'Filter for value',
  }
);

export const FILTER_OUT_VALUE = i18n.translate(
  'xpack.securitySolution.dragAndDrop.filterOutValueHoverAction',
  {
    defaultMessage: 'Filter out value',
  }
);

export const CLOSE = i18n.translate('xpack.securitySolution.dragAndDrop.closeButtonLabel', {
  defaultMessage: 'Close',
});

export const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.overview.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });
