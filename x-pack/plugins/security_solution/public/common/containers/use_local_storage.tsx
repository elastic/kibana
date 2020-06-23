/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useKibana } from '../lib/kibana';

export interface UseMessagesStorage {
  getMessages: (plugin: string) => string[];
  addMessage: (plugin: string, id: string) => void;
}

export const useMessagesStorage = (): UseMessagesStorage => {
  const { storage } = useKibana().services;

  const getMessages = useCallback(
    (plugin: string): string[] => {
      return storage.get(`${plugin}-messages`) ?? [];
    },
    [storage]
  );

  const addMessage = useCallback(
    (plugin: string, id: string) => {
      const pluginStorage = storage.get(`${plugin}-messages`) ?? [];
      storage.set(`${plugin}-messages`, [...pluginStorage, id]);
    },
    [storage]
  );

  return {
    getMessages,
    addMessage,
  };
};
