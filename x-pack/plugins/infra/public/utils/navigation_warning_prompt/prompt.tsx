/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useNavigationWarningPrompt } from './context';

interface Props {
  prompt?: string;
}

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
