/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 */

import React from 'react';

import { EuiEmptyPrompt, EuiLink, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SearchIndexEmptyState: React.FC = () => {
  return (
    <EuiPanel color="subdued">
      <EuiEmptyPrompt
        title={
          <h3>
            {i18n.translate('xpack.enterpriseSearch.content.newIndex.emptyState.title', {
              defaultMessage: 'Select an ingestion method',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.enterpriseSearch.content.newIndex.emptyState.description', {
              defaultMessage:
                'Data you add in Enterprise Search is called a search index and it’s searchable in both App Search and Workplace Search. Now you can use your connectors in App Search and your web crawlers in Workplace Search.',
            })}
          </p>
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.content.newIndex.emptyState.footer.title', {
                  defaultMessage: 'Want to learn more about search indices?',
                })}
              </h4>
            </EuiTitle>
            <EuiLink href="#" target="_blank">
              {i18n.translate('xpack.enterpriseSearch.content.newIndex.emptyState.footer.link', {
                defaultMessage: 'Read the docs',
              })}
            </EuiLink>
          </>
        }
      />
    </EuiPanel>
  );
};
