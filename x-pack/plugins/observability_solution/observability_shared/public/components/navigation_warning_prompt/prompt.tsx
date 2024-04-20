/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useNavigationWarningPrompt } from './context';

interface Props {
  prompt?: string;
}

export const Prompt = ({ prompt }: Props) => {
  const { setPrompt } = useNavigationWarningPrompt();

  useEffect(() => {
    setPrompt(prompt);
    return () => {
      setPrompt(undefined);
    };
  }, [prompt, setPrompt]);

  return null;
};
