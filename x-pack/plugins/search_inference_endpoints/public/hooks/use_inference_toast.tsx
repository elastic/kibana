/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from './use_kibana';

export const useInferenceToast = () => {
  const toasts = useKibana().notifications.toasts;

  return useMemo(
    () => ({
      showSuccessToast: (title: string) => {
        toasts.success({ title });
      },
      showErrorToast: (title: string) => {
        toasts.warning({ title });
      },
    }),
    [toasts]
  );
};
