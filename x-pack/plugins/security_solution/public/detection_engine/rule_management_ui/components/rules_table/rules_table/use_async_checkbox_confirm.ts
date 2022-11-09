/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

type UseAsyncConfirmationReturn = [
  initConfirmation: () => Promise<string | null>,
  confirm: (value: string) => void,
  cancel: () => void
];

interface UseAsyncConfirmationArgs {
  onInit: () => void;
  onFinish: () => void;
}

export const useAsyncCheckboxConfirmation = ({
  onInit,
  onFinish,
}: UseAsyncConfirmationArgs): UseAsyncConfirmationReturn => {
  const confirmationPromiseRef = useRef<(result: string | null) => void>();

  const confirm = useCallback((value: string) => {
    confirmationPromiseRef.current?.(value);
  }, []);

  const cancel = useCallback(() => {
    confirmationPromiseRef.current?.(null);
  }, []);

  const initConfirmation = useCallback(() => {
    onInit();

    return new Promise<string | null>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      onFinish();
    });
  }, [onInit, onFinish]);

  return [initConfirmation, confirm, cancel];
};
