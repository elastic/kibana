/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

type UseAsyncConfirmationReturn<T> = [
  initConfirmation: () => Promise<T | boolean>,
  confirm: (value?: T) => void,
  cancel: () => void
];

interface UseAsyncConfirmationArgs {
  onInit: () => void;
  onFinish: () => void;
}

// TODO move to common hooks
export const useAsyncConfirmation = <T = boolean>({
  onInit,
  onFinish,
}: UseAsyncConfirmationArgs): UseAsyncConfirmationReturn<T> => {
  const confirmationPromiseRef = useRef<(result: T | boolean) => void>();

  const confirm = useCallback((value?: T) => {
    confirmationPromiseRef.current?.(value ? value : true);
  }, []);

  const cancel = useCallback(() => {
    confirmationPromiseRef.current?.(false);
  }, []);

  const initConfirmation = useCallback(() => {
    onInit();

    return new Promise<T | boolean>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      onFinish();
    });
  }, [onInit, onFinish]);

  return [initConfirmation, confirm, cancel];
};
