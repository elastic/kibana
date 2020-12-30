/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import uuid from 'uuid';

import { useHighlightContext, OnHighlightChangeArgs } from './highlight_context';

export const useHighlightTreeNode = () => {
  const idRef = useRef<string>(uuid.v4());
  const { selectedRow, setStore } = useHighlightContext();

  const highlight = (value: OnHighlightChangeArgs) => {
    setStore({ id: idRef.current, ...value });
  };

  const isHighlighted = () => {
    return selectedRow === idRef.current;
  };

  return {
    id: idRef.current,
    highlight,
    isHighlighted,
  };
};
