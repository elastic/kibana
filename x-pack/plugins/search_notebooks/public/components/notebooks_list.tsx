/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {} from '@elastic/eui';

import { NotebookInformation } from '../../common/types';
import { LoadingPanel } from './loading_panel';
import { SelectionPanel } from './selection_panel';

export interface NotebooksListProps {
  notebooks: NotebookInformation[] | null;
  onNotebookSelect: (id: string) => void;
  selectedNotebookId: string;
}
export const NotebooksList = ({
  notebooks,
  onNotebookSelect,
  selectedNotebookId,
}: NotebooksListProps) => {
  if (notebooks === null) {
    // Loading Notebooks
    return <LoadingPanel />;
  }
  return (
    <>
      {notebooks.map((notebook) => (
        <SelectionPanel
          key={notebook.id}
          id={notebook.id}
          title={notebook.title}
          description={notebook.description}
          onClick={onNotebookSelect}
          isSelected={selectedNotebookId === notebook.id}
        />
      ))}
    </>
  );
};
