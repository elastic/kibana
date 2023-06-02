/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useState, useCallback } from 'react';

export const useIsUserTyping = () => {
  const [isUserTyping, setIsUserTyping] = useState(false);

  const onDebounce = useCallback(() => setIsUserTyping(false), []);

  const onContentChange = useCallback((value: string) => {
    if (!isEmpty(value)) {
      setIsUserTyping(true);
    }
  }, []);

  return { isUserTyping, setIsUserTyping, onDebounce, onContentChange };
};

export type UseIsUserTyping = ReturnType<typeof useIsUserTyping>;
