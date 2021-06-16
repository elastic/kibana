/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorToastOptions, IToasts, Toast } from 'kibana/public';
import { useState } from 'react';

export const useErrorToast = (toasts: IToasts) => {
  const [errorToast, setErrorToast] = useState<Toast>();
  return (error?: unknown, opts?: ErrorToastOptions) => {
    if (errorToast) {
      toasts.remove(errorToast);
    }
    if (error) {
      // @ts-expect-error update types
      setErrorToast(toasts.addError(error, opts));
    }
  };
};
