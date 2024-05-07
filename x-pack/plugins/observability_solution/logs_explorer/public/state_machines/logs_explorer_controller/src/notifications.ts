/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const createDatasetSelectionRestoreFailedNotifier = (toasts: IToasts) => () =>
  toasts.addWarning({
    title: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.restoreDatasetSelectionFailedToastTitle',
      { defaultMessage: "We couldn't restore your datasets selection." }
    ),
    text: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.restoreDatasetSelectionFailedToastMessage',
      { defaultMessage: 'We switched to "All log datasets" as the default selection.' }
    ),
  });

export const createDataViewSelectionRestoreFailedNotifier = (toasts: IToasts) => () =>
  toasts.addWarning({
    title: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.restoreDataViewSelectionFailedToastTitle',
      { defaultMessage: "We couldn't restore your data view selection." }
    ),
    text: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.restoreDataViewSelectionFailedToastMessage',
      { defaultMessage: 'We switched to "All log datasets" as the default selection.' }
    ),
  });

export const createCreateDataViewFailedNotifier = (toasts: IToasts) => () =>
  toasts.addWarning({
    title: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.createAdHocDataViewFailedToastTitle',
      {
        defaultMessage: "We couldn't create a data view for your selection.",
      }
    ),
    text: i18n.translate(
      'xpack.logsExplorer.dataSourceSelection.createAdHocDataViewFailedToastMessage',
      {
        defaultMessage: 'We switched to "All log datasets" as the default selection.',
      }
    ),
  });
