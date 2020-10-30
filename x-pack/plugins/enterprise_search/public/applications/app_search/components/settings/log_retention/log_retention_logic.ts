/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { ELogRetentionOptions } from './types';

interface ILogRetentionActions {
  clearLogRetentionUpdating(): { value: boolean };
  closeModals(): { value: boolean };
  setOpenModal(option: ELogRetentionOptions): { option: ELogRetentionOptions };
}

interface ILogRetentionValues {
  logsRetentionUpdating: boolean;
  openModal: ELogRetentionOptions | null;
}

export const LogRetentionLogic = kea<MakeLogicType<ILogRetentionValues, ILogRetentionActions>>({
  path: ['enterprise_search', 'app_search', 'log_retention_logic'],
  actions: () => ({
    clearLogRetentionUpdating: true,
    closeModals: true,
    setOpenModal: (option) => ({ option }),
  }),
  reducers: () => ({
    logsRetentionUpdating: [
      false,
      {
        clearLogRetentionUpdating: () => false,
        closeModals: () => false,
      },
    ],
    openModal: [
      null,
      {
        closeModals: () => null,
        setOpenModal: (_, { option }) => option,
      },
    ],
  }),
});
