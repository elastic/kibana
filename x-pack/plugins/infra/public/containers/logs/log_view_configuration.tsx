/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState } from 'react';

export type TextScale = 'small' | 'medium' | 'large';

export const useLogViewConfiguration = () => {
  // text scale
  const [textScale, setTextScale] = useState<TextScale>('medium');

  // text wrap
  const [textWrap, setTextWrap] = useState<boolean>(true);

  return {
    availableTextScales,
    setTextScale,
    setTextWrap,
    textScale,
    textWrap,
  };
};

export const LogViewConfiguration = createContainer(useLogViewConfiguration);

/**
 * constants
 */

export const availableTextScales: TextScale[] = ['large', 'medium', 'small'];
