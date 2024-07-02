/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const STORAGE_DEBOUNCE_TIME = 500;

export interface SessionStorageType {
  field: FieldHook<string>;
  sessionKey: string;
  initialValue: string | undefined;
}

export const useMarkdownSessionStorage = ({
  field,
  sessionKey,
  initialValue,
}: SessionStorageType) => {
  const [hasConflicts, setHasConflicts] = useState<boolean>(false);
  const isFirstRender = useRef(true);
  const initialValueRef = useRef(initialValue);

  const [sessionValue, setSessionValue] = useSessionStorage(sessionKey, '', true);

  if (!isEmpty(sessionValue) && !isEmpty(sessionKey) && isFirstRender.current) {
    field.setValue(sessionValue);
  }

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  if (initialValue !== initialValueRef.current && initialValue !== field.value) {
    initialValueRef.current = initialValue;
    setHasConflicts(true);
  }

  useDebounce(
    () => {
      if (!isEmpty(sessionKey)) {
        setSessionValue(field.value);
      }
    },
    STORAGE_DEBOUNCE_TIME,
    [field.value]
  );

  return { hasConflicts };
};
