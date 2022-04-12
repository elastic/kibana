/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useNavigationWarningPrompt } from './context';

interface Props {
  prompt?: string;
}

// eslint-disable-next-line react/function-component-definition
export const Prompt: React.FC<Props> = ({ prompt }) => {
  const { setPrompt } = useNavigationWarningPrompt();

  useEffect(() => {
    setPrompt(prompt);
    return () => {
      setPrompt(undefined);
    };
  }, [prompt, setPrompt]);

  return null;
};
