/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Need get dynamic Enterprise Search API URL
 * - Port over existing elasticsearch view from App Search to the panel below.
 * - Replace `onNameChange` logic with that from App Search
 * - Need to implement the logic for the attaching search engines functionality
 */

import React from 'react';

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodEs: React.FC = () => {
  const onNameChange = (value: string) => value;

  return (
    <NewSearchIndexTemplate
      description={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodElasticsearch.description',
        {
          defaultMessage:
            'Serve results from an existing Elasticsearch index alongside your other content. Use Enterprise Search features like curations and relevance tuning.',
        }
      )}
      docsUrl="#"
      type="Elasticsearch index"
      onNameChange={(value: string) => onNameChange(value)}
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
          <h4>Place the Elasticsearch index selectable list here... </h4>
        </EuiTitle>
      </EuiPanel>
    </NewSearchIndexTemplate>
  );
};
