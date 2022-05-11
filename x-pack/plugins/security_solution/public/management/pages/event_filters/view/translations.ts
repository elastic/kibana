/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ServerApiError } from '../../../../common/types';
import { EventFiltersForm } from '../types';

export const getCreationSuccessMessage = (entry: EventFiltersForm['entry']) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.creationSuccessToastTitle', {
    defaultMessage: '"{name}" has been added to the event filters list.',
    values: { name: entry?.name },
  });
};

export const getUpdateSuccessMessage = (entry: EventFiltersForm['entry']) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.updateSuccessToastTitle', {
    defaultMessage: '"{name}" has been updated successfully.',
    values: { name: entry?.name },
  });
};

export const getCreationErrorMessage = (creationError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.create', {
    defaultMessage: 'There was an error creating the new event filter: "{error}"',
    values: { error: creationError.message },
  });
};

export const getUpdateErrorMessage = (updateError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.update', {
    defaultMessage: 'There was an error updating the event filter: "{error}"',
    values: { error: updateError.message },
  });
};

export const getGetErrorMessage = (getError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.get', {
    defaultMessage: 'Unable to edit event filter: "{error}"',
    values: { error: getError.message },
  });
};

export const ABOUT_EVENT_FILTERS = i18n.translate('xpack.securitySolution.eventFilters.aboutInfo', {
  defaultMessage:
    'Add an event filter to exclude high volume or unwanted events from being written to Elasticsearch.',
});
