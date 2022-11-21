/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../common/translations';

export const ERROR_TITLE = i18n.translate('xpack.cases.containers.errorTitle', {
  defaultMessage: 'Error fetching data',
});

export const ERROR_DELETING = i18n.translate('xpack.cases.containers.errorDeletingTitle', {
  defaultMessage: 'Error deleting data',
});

export const ERROR_UPDATING = i18n.translate('xpack.cases.containers.errorUpdatingTitle', {
  defaultMessage: 'Error updating data',
});

export const UPDATED_CASE = (caseTitle: string) =>
  i18n.translate('xpack.cases.containers.updatedCase', {
    values: { caseTitle },
    defaultMessage: 'Updated "{caseTitle}"',
  });

export const UPDATED_CASES = i18n.translate('xpack.cases.containers.updatedCases', {
  defaultMessage: 'Updated cases',
});

export const SUCCESS_SEND_TO_EXTERNAL_SERVICE = (serviceName: string) =>
  i18n.translate('xpack.cases.containers.pushToExternalService', {
    values: { serviceName },
    defaultMessage: 'Successfully sent to { serviceName }',
  });

export const SYNC_CASE = (caseTitle: string) =>
  i18n.translate('xpack.cases.containers.syncCase', {
    values: { caseTitle },
    defaultMessage: 'Alerts in "{caseTitle}" have been synced',
  });

export const STATUS_CHANGED_TOASTER_TEXT = i18n.translate(
  'xpack.cases.containers.statusChangeToasterText',
  {
    defaultMessage: 'Updated the statuses of attached alerts.',
  }
);
