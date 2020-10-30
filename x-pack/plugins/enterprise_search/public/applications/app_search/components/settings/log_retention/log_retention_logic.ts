/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { ELogRetentionOptions } from './types';

interface ILogRetentionActions {
  setOpenModal(option: ELogRetentionOptions): { option: ELogRetentionOptions };
}

interface ILogRetentionValues {
  openModal: ELogRetentionOptions | null;
}

export const LogRetentionLogic = kea<MakeLogicType<ILogRetentionValues, ILogRetentionActions>>({
  path: ['enterprise_search', 'app_search', 'log_retention_logic'],
  actions: () => ({
    setOpenModal: (option) => ({ option }),
  }),
  reducers: () => ({
    openModal: [
      null,
      {
        setOpenModal: (_, { option }) => option,
      },
    ],
  }),
});
