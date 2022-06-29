/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';

import * as i18n from './translations';

const ExeptionItemsViewerEmptySearchResultsComponent = (): JSX.Element => (
  <EuiFlexItem grow={1}>
    <EuiEmptyPrompt
      title={
        <h2 data-test-subj="exceptionItemsNoSearchResultsEmptyPromptTitle">
          {i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY}
        </h2>
      }
      data-test-subj="exceptionItemsNoSearchResultsPrompt"
    />
  </EuiFlexItem>
);

ExeptionItemsViewerEmptySearchResultsComponent.displayName =
  'ExeptionItemsViewerEmptySearchResultsComponent';

export const ExeptionItemsViewerEmptySearchResults = React.memo(
  ExeptionItemsViewerEmptySearchResultsComponent
);

ExeptionItemsViewerEmptySearchResults.displayName = 'ExeptionItemsViewerEmptySearchResults';
