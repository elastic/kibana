/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface EmptyResultsArgs {
  query?: string;
}

export const EmptyResults: React.FC<EmptyResultsArgs> = ({ query }) => {
  return (
    <EuiEmptyPrompt
      body={
        <p>
          {query
            ? i18n.translate('xpack.searchPlayground.resultList.emptyWithQuery.text', {
                defaultMessage: 'No result found for: {query}',
                values: { query },
              })
            : i18n.translate('xpack.searchPlayground.resultList.empty.text', {
                defaultMessage: 'No results found',
              })}
        </p>
      }
    />
  );
};
