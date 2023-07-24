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
      'xpack.discoverLogExplorer.datasetSelection.restoreDatasetSelectionFailedToastTitle',
      { defaultMessage: "We couldn't restore your datasets selection." }
    ),
    text: i18n.translate(
      'xpack.discoverLogExplorer.datasetSelection.restoreDatasetSelectionFailedToastMessage',
      { defaultMessage: 'We switched to "All log datasets" as the default selection.' }
    ),
  });

export const createCreateDataViewFailedNotifier = (toasts: IToasts) => () =>
  toasts.addWarning({
    title: i18n.translate(
      'xpack.discoverLogExplorer.datasetSelection.createDataViewFailedToastTitle',
      { defaultMessage: "We couldn't create a data view for your selection." }
    ),
    text: i18n.translate(
      'xpack.discoverLogExplorer.datasetSelection.createDataViewFailedToastMessage',
      { defaultMessage: 'We switched to "All log datasets" as the default selection.' }
    ),
  });
