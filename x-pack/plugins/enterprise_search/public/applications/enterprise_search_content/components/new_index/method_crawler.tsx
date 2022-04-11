/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over existing Crawler view from App Search to the panel below.
 */

import React from 'react';

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodCrawler: React.FC = () => {
  return (
    <NewSearchIndexTemplate
      description={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodCrawler.description',
        {
          defaultMessage:
            'The Elastic Web Crawler allows you to easily and automatically index content from public-facing websites and knowledge bases.',
        }
      )}
      docsUrl="#"
      type="Web Crawler"
    >
      <EuiPanel
        color="subdued"
        style={{
          minHeight: '30rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiTitle size="s">
          <h4>Place the crawler domain validation here...</h4>
        </EuiTitle>
      </EuiPanel>
    </NewSearchIndexTemplate>
  );
};
