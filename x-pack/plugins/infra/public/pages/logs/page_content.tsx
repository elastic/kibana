/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { SourceErrorPage } from '../../components/source_error_page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { Source } from '../../containers/source';
import { LogsPageLogsContent } from './page_logs_content';
import { LogsPageNoIndicesContent } from './page_no_indices_content';

export const LogsPageContent: React.FunctionComponent = () => {
  const {
    hasFailedLoadingSource,
    isLoadingSource,
    logIndicesExist,
    loadSource,
    loadSourceFailureMessage,
  } = useContext(Source.Context);

  return (
    <>
      {isLoadingSource ? (
        <SourceLoadingPage />
      ) : logIndicesExist ? (
        <LogsPageLogsContent />
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
      ) : (
        <LogsPageNoIndicesContent />
      )}
    </>
  );
};
