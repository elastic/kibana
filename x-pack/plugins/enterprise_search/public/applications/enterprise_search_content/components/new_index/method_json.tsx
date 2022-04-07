/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over existing JSON view from App Search to the panel below.
 * - Replace `onNameChange` logic with that from App Search
 */

import React from 'react';

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodJson: React.FC = () => {
  const onNameChange = (value: string) => value;

  return (
    <NewSearchIndexTemplate
      description={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodJson.description',
        {
          defaultMessage: 'Paste or upload JSON data.',
        }
      )}
      docsUrl="#"
      type="JSON"
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
          <h4>Place the JSON tabs here...</h4>
        </EuiTitle>
      </EuiPanel>
    </NewSearchIndexTemplate>
  );
};
