/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessage } from '../../utils/get_error_message';
import { useKibanaServices } from './use_kibana';

export const useShowErrorToast = () => {
  const { notifications } = useKibanaServices();

  return (error: unknown, errorTitle?: string) =>
    notifications.toasts.addError(new Error(getErrorMessage(error)), {
      title: errorTitle || getErrorMessage(error),
    });
};
