/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RELEVANCE_DOCS_URL } from '../../../routes';

export const EmptyState: React.FC = () => (
  <EuiEmptyPrompt
    iconType="wrench"
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.relevanceTuning.empty.title', {
          defaultMessage: 'Add documents to tune relevance',
        })}
      </h2>
    }
    body={i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.empty.description',
      {
        defaultMessage:
          'A schema will be automatically created for you after you index some documents.',
      }
    )}
    actions={
      <EuiButton size="s" target="_blank" iconType="popout" href={RELEVANCE_DOCS_URL}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.empty.buttonLabel',
          { defaultMessage: 'Read the relevance tuning guide' }
        )}
      </EuiButton>
    }
  />
);
