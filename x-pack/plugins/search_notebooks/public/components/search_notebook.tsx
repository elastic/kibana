/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiPanel } from '@elastic/eui';
import { NotebookRenderer } from '@kbn/ipynb';

import { useNotebook } from '../hooks/use_notebook';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { LoadingPanel } from './loading_panel';
import { SearchNotebookError } from './search_notebook_error';

export interface SearchNotebookProps {
  notebookId: string;
}
export const SearchNotebook = ({ notebookId }: SearchNotebookProps) => {
  const usageTracker = useUsageTracker();
  const { data, isLoading, error } = useNotebook(notebookId);
  useEffect(() => {
    usageTracker.count(['view-notebook', `nb-${notebookId}`]);
  }, [usageTracker, notebookId]);

  if (isLoading) {
    return <LoadingPanel />;
  }
  if (!data || error) {
    return (
      <SearchNotebookError notebookId={notebookId} usageTracker={usageTracker} error={error} />
    );
  }
  return (
    <EuiPanel
      paddingSize="xl"
      hasShadow={false}
      style={{ display: 'flex', justifyContent: 'center' }}
      data-test-subj={`console-embedded-notebook-view-panel-${notebookId}`}
    >
      <NotebookRenderer notebook={data.notebook} />
    </EuiPanel>
  );
};
