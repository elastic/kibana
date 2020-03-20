/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/source';
import { LogsPageLogsContent } from './page_logs_content';
import { LogsPageNoIndicesContent } from './page_no_indices_content';

export const StreamPageContent: React.FunctionComponent = () => {
  const {
    hasFailedLoadingSource,
    isLoadingSource,
    isUninitialized,
    loadSource,
    loadSourceFailureMessage,
    logIndicesExist,
  } = useSourceContext();

  if (isLoadingSource || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingSource) {
    return <SourceErrorPage errorMessage={loadSourceFailureMessage ?? ''} retry={loadSource} />;
  } else if (logIndicesExist) {
    return <LogsPageLogsContent />;
  } else {
    return <LogsPageNoIndicesContent />;
  }
};
