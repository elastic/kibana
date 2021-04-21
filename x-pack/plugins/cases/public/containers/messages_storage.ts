/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

/**
 * Storage is essentially just a helper for stringifying and parsing data in the
 * storage container provided. We default to localStorage, so multiple instances
 * of storage will end up using the same state.
 */

export const addMessage = (id: string, storageSource = localStorage) => {
  const storage = new Storage(storageSource);
  const pluginStorage = storage?.get('cases-messages') ?? [];
  storage?.set('cases-messages', [...pluginStorage, id]);
};

export const clearAllMessages = (storageSource = localStorage): void => {
  const storage = new Storage(storageSource);
  storage?.remove('cases-messages');
};

export const getMessages = (storageSource = localStorage): string[] => {
  const storage = new Storage(storageSource);
  return storage?.get('cases-messages') ?? [];
};

export const hasMessage = (id: string, storageSource = localStorage) => {
  const storage = new Storage(storageSource);
  const pluginStorage = storage?.get('cases-messages') ?? [];
  return pluginStorage.filter((val: string) => val === id).length > 0;
};

export const removeMessage = (id: string, storageSource = localStorage) => {
  const storage = new Storage(storageSource);
  const pluginStorage = storage?.get('cases-messages') ?? [];
  storage?.set('cases-messages', [...pluginStorage.filter((val: string) => val !== id)]);
};
