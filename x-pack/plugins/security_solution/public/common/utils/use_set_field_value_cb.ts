/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useSetFieldValueWithCallback = ({
  field,
  setFieldValue,
  value,
}: {
  field: string;
  value: unknown;
  setFieldValue: FormHook['setFieldValue'];
}) => {
  const isWaitingRef = useRef(false);
  const valueRef = useRef<unknown>();
  const [callback, setCallback] = useState<() => void>(() => null);

  useEffect(() => {
    if (isWaitingRef.current && value === valueRef.current) {
      isWaitingRef.current = false;
      valueRef.current = undefined;
      callback();
    }
  }, [value, callback]);

  return useCallback(
    (v: unknown, cb: () => void) => {
      setFieldValue(field, v);

      setCallback(() => cb);
      valueRef.current = v;
      isWaitingRef.current = true;
    },
    [field, setFieldValue]
  );
};
