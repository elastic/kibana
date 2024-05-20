/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SYNONYMS_DOCS_URL } from '../../../routes';

import { SynonymModal, SynonymIcon } from '.';

export const EmptyState: React.FC = () => {
  return (
    <>
      <EuiEmptyPrompt
        iconType={SynonymIcon}
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.synonyms.empty.title', {
              defaultMessage: 'Create your first synonym set',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.synonyms.empty.description', {
              defaultMessage:
                'Synonyms relate queries with similar context or meaning together. Use them to guide users to relevant content.',
            })}
          </p>
        }
        actions={
          <EuiButton size="s" target="_blank" iconType="popout" href={SYNONYMS_DOCS_URL}>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.synonyms.empty.buttonLabel', {
              defaultMessage: 'Read the synonyms guide',
            })}
          </EuiButton>
        }
      />
      <SynonymModal />
    </>
  );
};
