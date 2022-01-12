/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useAppToasts } from './use_app_toasts';

/**
 * Display App error toast when error is defined.
 */
export const useErrorToast = (title: string, error: unknown) => {
  const { addError } = useAppToasts();

  useEffect(() => {
    if (error) {
      addError(error, { title });
    }
  }, [error, title, addError]);
};
