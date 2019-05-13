/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// @ts-ignore
import { ML_BREADCRUMB } from '../breadcrumbs';

export function getJobManagementBreadcrumbs() {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [ML_BREADCRUMB];
}

export function getDataFrameBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.dataFrameBreadcrumbs.dataFrameLabel', {
        defaultMessage: 'Data Frames',
      }),
      href: '',
    },
  ];
}

const DATA_FRAME_HOME = {
  text: i18n.translate('xpack.ml.dataFrameBreadcrumbs.dataFrameLabel', {
    defaultMessage: 'Data Frames',
  }),
  href: '#/data_frames',
};

export function getDataFrameCreateBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    DATA_FRAME_HOME,
    {
      text: i18n.translate('xpack.ml.dataFrameBreadcrumbs.dataFrameCreateLabel', {
        defaultMessage: 'Create data frame',
      }),
      href: '',
    },
  ];
}

export function getDataFrameIndexOrSearchBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    DATA_FRAME_HOME,
    {
      text: i18n.translate('xpack.ml.dataFrameBreadcrumbs.selectIndexOrSearchLabel', {
        defaultMessage: 'Select index or search',
      }),
      href: '',
    },
  ];
}
