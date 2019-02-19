/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback, useMemo, useState } from 'react';

export type TextScale = 'small' | 'medium' | 'large';
export const availableTextScales: TextScale[] = ['large', 'medium', 'small'];

export const useLogViewConfiguration = () => {
  const [textScale, setTextScale] = useState<TextScale>('medium');

  const [textWrap, setTextWrap] = useState<boolean>(true);
  const enableTextWrap = useCallback(() => setTextWrap(true), [setTextWrap]);
  const disableTextWrap = useCallback(() => setTextWrap(false), [setTextWrap]);

  return useMemo(
    () => ({
      availableTextScales,
      disableTextWrap,
      enableTextWrap,
      setTextScale,
      setTextWrap,
      textScale,
      textWrap,
    }),
    [textScale, textWrap]
  );
};

export const LogViewConfiguration = createContainer(useLogViewConfiguration);
