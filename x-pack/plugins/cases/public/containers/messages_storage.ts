/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

let instance: MessagesStorage;
export class MessagesStorage {
  private storage;
  constructor() {
    if (!instance) {
      instance = this;
      this.storage = new Storage(localStorage);
    }
    return instance;
  }

  addMessage = (plugin: string, id: string) => {
    const pluginStorage = this.storage?.get(`${plugin}-messages`) ?? [];
    this.storage?.set(`${plugin}-messages`, [...pluginStorage, id]);
  };

  clearAllMessages = (plugin: string): void => {
    return this.storage?.remove(`${plugin}-messages`);
  };

  getMessages = (plugin: string): string[] => {
    return this.storage?.get(`${plugin}-messages`) ?? [];
  };

  hasMessage = (plugin: string, id: string) => {
    const pluginStorage = this.storage?.get(`${plugin}-messages`) ?? [];
    return pluginStorage.filter((val: string) => val === id).length > 0;
  };

  removeMessage = (plugin: string, id: string) => {
    const pluginStorage = this.storage?.get(`${plugin}-messages`) ?? [];
    this.storage?.set(`${plugin}-messages`, [...pluginStorage.filter((val: string) => val !== id)]);
  };
}
