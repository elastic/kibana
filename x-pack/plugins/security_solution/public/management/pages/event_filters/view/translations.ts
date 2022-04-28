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

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventFilter.form.name.placeholder',
  {
    defaultMessage: 'Event filter name',
  }
);

export const NAME_LABEL = i18n.translate('xpack.securitySolution.eventFilter.form.name.label', {
  defaultMessage: 'Name your event filter',
});
export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.eventFilter.form.description.placeholder',
  {
    defaultMessage: 'Description',
  }
);

export const DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventFilter.form.description.label',
  {
    defaultMessage: 'Describe your event filter',
  }
);

export const NAME_ERROR = i18n.translate('xpack.securitySolution.eventFilter.form.name.error', {
  defaultMessage: "The name can't be empty",
});

export const OS_LABEL = i18n.translate('xpack.securitySolution.eventFilter.form.os.label', {
  defaultMessage: 'Select operating system',
});

export const RULE_NAME = i18n.translate('xpack.securitySolution.eventFilter.form.rule.name', {
  defaultMessage: 'Endpoint Event Filtering',
});
