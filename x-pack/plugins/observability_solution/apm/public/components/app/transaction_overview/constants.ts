/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgName: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsTitle', {
    defaultMessage: 'Troubleshoot latency, throughput and errors',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsContent', {
    defaultMessage:
      "Troubleshoot your service's performance by analysing latency, throughput and errors down to the specific transaction.",
  }),
  imgName: 'service_tab_empty_state_transactions.png',
};
