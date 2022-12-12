/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
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

  const sessionValue = sessionStorage.getItem(sessionKey) ?? '';

  if (!isEmpty(sessionValue) && isFirstRender.current) {
    isFirstRender.current = false;
    field.setValue(sessionValue);
  }

  if (initialValue !== initialValueRef.current && initialValue !== field.value) {
    initialValueRef.current = initialValue;
    setHasConflicts(true);
  }

  useDebounce(
    () => {
      if (isFirstRender.current) {
        if (isEmpty(sessionValue) && !isEmpty(field.value)) {
          /* this condition is used to for lens draft comment, 
            when user selects and visualization and comes back to Markdown editor,
            it is a first render for Markdown editor, however field has value of visualization which is not stored in session 
            hence saving this item in session storage
          */
          sessionStorage.setItem(sessionKey, field.value);
        }
        isFirstRender.current = false;
        return;
      }

      sessionStorage.setItem(sessionKey, field.value);
    },
    STORAGE_DEBOUNCE_TIME,
    [field.value]
  );

  return { hasConflicts };
};
