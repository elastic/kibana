/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { API_DOCS_URL } from '../../../routes';

export const EmptyState: React.FC = () => (
  <EuiEmptyPrompt
    iconType="clock"
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.emptyTitle', {
          defaultMessage: 'No API events in the last 24 hours',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.emptyDescription', {
          defaultMessage: 'Logs will update in real-time when an API request occurs.',
        })}
      </p>
    }
    actions={
      <EuiButton size="s" target="_blank" iconType="popout" href={API_DOCS_URL}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.empty.buttonLabel', {
          defaultMessage: 'View the API reference',
        })}
      </EuiButton>
    }
  />
);
