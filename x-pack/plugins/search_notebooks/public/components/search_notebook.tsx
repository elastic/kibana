/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiEmptyPrompt, EuiCodeBlock } from '@elastic/eui';
import { NotebookRenderer } from '@kbn/ipynb';
import { FormattedMessage } from '@kbn/i18n-react';

import { useNotebook } from '../hooks/use_notebook';
import { LoadingPanel } from './loading_panel';

export interface SearchNotebookProps {
  notebookId: string;
}
export const SearchNotebook = ({ notebookId }: SearchNotebookProps) => {
  const { data, isLoading, error } = useNotebook(notebookId);
  if (isLoading) {
    return <LoadingPanel />;
  }
  if (!data || error) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.searchNotebooks.notebook.fetchError.title"
              defaultMessage="Error loading notebook"
            />
          </h2>
        }
        titleSize="l"
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.searchNotebooks.notebook.fetchError.body"
                defaultMessage="We can't fetch the notebook from Kibana due to the following error:"
              />
            </p>
            <EuiCodeBlock css={{ textAlign: 'left' }}>{JSON.stringify(error)}</EuiCodeBlock>
          </>
        }
      />
    );
  }
  return (
    <EuiPanel
      paddingSize="xl"
      hasShadow={false}
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      <NotebookRenderer notebook={data.notebook} />
    </EuiPanel>
  );
};
