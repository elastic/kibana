/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

type UseAsyncConfirmationReturn = [
  initConfirmation: () => Promise<boolean>,
  confirm: () => void,
  cancel: () => void
];

interface UseAsyncConfirmationArgs {
  onInit: () => void;
  onFinish: () => void;
}

export const useAsyncConfirmation = ({
  onInit,
  onFinish,
}: UseAsyncConfirmationArgs): UseAsyncConfirmationReturn => {
  const confirmationPromiseRef = useRef<(result: boolean) => void>();

  const confirm = useCallback(() => {
    confirmationPromiseRef.current?.(true);
  }, []);

  const cancel = useCallback(() => {
    confirmationPromiseRef.current?.(false);
  }, []);

  const initConfirmation = useCallback(() => {
    onInit();

    return new Promise<boolean>((resolve) => {
      confirmationPromiseRef.current = resolve;
    }).finally(() => {
      onFinish();
    });
  }, [onInit, onFinish]);

  return [initConfirmation, confirm, cancel];
};
