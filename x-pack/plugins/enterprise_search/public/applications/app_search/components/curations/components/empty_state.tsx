/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CURATIONS_DOCS_URL } from '../../../routes';

export const EmptyState: React.FC = () => (
  <EuiEmptyPrompt
    data-test-subj="emptyCurationsPrompt"
    iconType="pin"
    title={
      <h2>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.empty.noCurationsTitle',
          { defaultMessage: 'Create your first curation' }
        )}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.empty.description', {
          defaultMessage:
            'Use curations to promote and hide documents. Help people discover what you would most like them to discover.',
        })}
      </p>
    }
    actions={
      <EuiButton size="s" target="_blank" iconType="popout" href={CURATIONS_DOCS_URL}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.empty.buttonLabel', {
          defaultMessage: 'Read the curations guide',
        })}
      </EuiButton>
    }
  />
);
