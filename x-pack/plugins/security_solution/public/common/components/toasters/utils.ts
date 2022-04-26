/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import uuid from 'uuid';
import { isError } from 'lodash/fp';
import { isAppError } from '@kbn/securitysolution-t-grid';

import { AppToast, ActionToaster } from '.';
import { isToasterError } from './errors';

/**
 * Displays an error toast for the provided title and message
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 * @param errorTitle Title of error to display in toaster and modal
 * @param errorMessages Message to display in error modal when clicked
 * @param dispatchToaster provided by useStateToaster()
 */
export const displayErrorToast = (
  errorTitle: string,
  errorMessages: string[],
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title: errorTitle,
    color: 'danger',
    iconType: 'alert',
    errors: errorMessages,
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Displays a warning toast for the provided title and message
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 * @param title warning message to display in toaster and modal
 * @param dispatchToaster provided by useStateToaster()
 * @param id unique ID if necessary
 */
export const displayWarningToast = (
  title: string,
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title,
    color: 'warning',
    iconType: 'help',
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Displays a success toast for the provided title and message
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 * @param title success message to display in toaster and modal
 * @param dispatchToaster provided by useStateToaster()
 */
export const displaySuccessToast = (
  title: string,
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title,
    color: 'success',
    iconType: 'check',
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

export type ErrorToToasterArgs = Partial<AppToast> & {
  error: unknown;
  dispatchToaster: React.Dispatch<ActionToaster>;
};

/**
 * Displays an error toast with messages parsed from the error.
 *
 * This has shortcomings and bugs compared to using the use_app_toasts because it takes naive guesses at the
 * underlying data structure and does not display much about the error. This is not compatible with bsearch (async search)
 * and sometimes can display to the user blank messages.
 *
 * The use_app_toasts has more feature rich logic and uses the Kibana toaster system to figure out which type of
 * error you have in a more robust way then this function does and supersedes this function.
 *
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 * @param title error message to display in toaster and modal
 * @param error the error from which messages will be parsed
 * @param dispatchToaster provided by useStateToaster()
 */
export const errorToToaster = ({
  id = uuid.v4(),
  title,
  error,
  color = 'danger',
  iconType = 'alert',
  dispatchToaster,
}: ErrorToToasterArgs) => {
  let toast: AppToast;

  if (isToasterError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: error.messages,
    };
  } else if (isAppError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: [error.body.message],
    };
  } else if (isError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: [error.message],
    };
  } else {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: ['Network Error'],
    };
  }

  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};
