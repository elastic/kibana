/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea } from 'kea';

export const AuditLogsModalLogic = kea({
  path: ['enterprise_search', 'app_search', 'engines_overview', 'audit_logs_modal'],
  actions: () => ({
    hideModal: true,
    showModal: (engineName: string) => ({ engineName }),
  }),
  reducers: () => ({
    isModalVisible: [
      false,
      {
        showModal: () => true,
        hideModal: () => false,
      },
    ],
    engineName: [
      '',
      {
        showModal: (_, { engineName }) => engineName,
        hideModal: () => '',
      },
    ],
  }),
});
