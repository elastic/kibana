/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorToastOptions, Toast } from 'kibana/public';
import { useState } from 'react';
import { useKibana } from '../../common/lib/kibana';

export const useErrorToast = () => {
  const [errorToast, setErrorToast] = useState<Toast>();
  const {
    notifications: { toasts },
  } = useKibana().services;

  return (error?: unknown, opts?: ErrorToastOptions) => {
    if (errorToast) {
      toasts.remove(errorToast);
    }

    if (error) {
      setErrorToast(
        // @ts-expect-error update types
        toasts.addError(error, { title: error?.body?.error || error?.body?.message, ...opts })
      );
    }
  };
};
