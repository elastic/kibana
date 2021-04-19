/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../../../public/shared_imports';
import { ServerApiError } from '../../../../../../common/types';
import { isCreationSuccessful, getFormEntry, getCreationError } from '../../../store/selector';

import { useToasts } from '../../../../../../common/lib/kibana';
import { useEventFilterSelector } from '../../hooks';

const getCreationSuccessMessage = (
  entry: CreateExceptionListItemSchema | ExceptionListItemSchema | undefined
) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.successToastTitle', {
    defaultMessage: '"{name}" has been added to the event exceptions list.',
    values: { name: entry?.name },
  });
};

const getCreationErrorMessage = (creationError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.successToastTitle', {
    defaultMessage: 'There was an error creating the new exception: "{error}"',
    values: { error: creationError.message },
  });
};

export const EventFilterNotification = memo(() => {
  const creationSuccessful = useEventFilterSelector(isCreationSuccessful);
  const creationError = useEventFilterSelector(getCreationError);
  const formEntry = useEventFilterSelector(getFormEntry);
  const toasts = useToasts();
  const [wasAlreadyHandled] = useState(new WeakSet());

  if (creationSuccessful && formEntry && !wasAlreadyHandled.has(formEntry)) {
    wasAlreadyHandled.add(formEntry);
    toasts.addSuccess(getCreationSuccessMessage(formEntry));
  } else if (creationError && !wasAlreadyHandled.has(creationError)) {
    wasAlreadyHandled.add(creationError);
    toasts.addDanger(getCreationErrorMessage(creationError));
  }

  return <></>;
});

EventFilterNotification.displayName = 'EventFilterNotification';
