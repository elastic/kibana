/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ToggleFinishedCard } from '../../get_started/types';

interface ModalContextValue {
  openModal: () => void;
  closeModal: () => void;
  toggleFinishedCard: ToggleFinishedCard;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalContextProvider: React.FC<{
  children: React.ReactNode;
  context: ModalContextValue;
}> = ({ children, context }) => {
  return <ModalContext.Provider value={context}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('ModalContext not found');
  }
  return context;
};
