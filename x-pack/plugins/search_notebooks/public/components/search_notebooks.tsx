/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiResizableContainer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { INTRODUCTION_NOTEBOOK, DEFAULT_NOTEBOOK_ID } from '../../common/constants';
import { useNotebooksCatalog } from '../hooks/use_notebook_catalog';
import { NotebooksList } from './notebooks_list';
import { SelectionPanel } from './selection_panel';
import { TitlePanel } from './title_panel';
import { SearchNotebook } from './search_notebook';
import { SearchLabsButtonPanel } from './search_labs_button_panel';
import { readNotebookParameter } from '../utils/notebook_query_param';

const LIST_PANEL_ID = 'notebooksList';
const OUTPUT_PANEL_ID = 'notebooksOutput';
const defaultSizes: Record<string, number> = {
  [LIST_PANEL_ID]: 25,
  [OUTPUT_PANEL_ID]: 75,
};

export const SearchNotebooks = () => {
  const [sizes, setSizes] = useState(defaultSizes);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(
    readNotebookParameter() ?? DEFAULT_NOTEBOOK_ID
  );
  const { data } = useNotebooksCatalog();
  const onPanelWidthChange = useCallback((newSizes: Record<string, number>) => {
    setSizes((prevSizes: Record<string, number>) => ({
      ...prevSizes,
      ...newSizes,
    }));
  }, []);
  useEffect(() => {
    if (!data) return;
    const selectedNotebookFound =
      data.notebooks.find((nb) => nb.id === selectedNotebookId) !== undefined;
    if (!selectedNotebookFound) {
      // If the currently selected notebook is not in the list of notebooks revert
      // to the default notebook selection.
      setSelectedNotebookId(DEFAULT_NOTEBOOK_ID);
    }
  }, [data, selectedNotebookId]);
  const notebooks = useMemo(() => {
    if (data) return data.notebooks;
    return null;
  }, [data]);
  const onNotebookSelectionClick = useCallback((id: string) => {
    setSelectedNotebookId(id);
  }, []);

  return (
    <EuiResizableContainer
      style={{ height: '100%', width: '100%' }}
      onPanelWidthChange={onPanelWidthChange}
      data-test-subj="consoleEmbeddedNotebooksContainer"
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id={LIST_PANEL_ID}
            size={sizes[LIST_PANEL_ID]}
            minSize="10%"
            tabIndex={0}
            paddingSize="none"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              <TitlePanel>
                {i18n.translate('xpack.searchNotebooks.notebooksList.introduction.title', {
                  defaultMessage: 'Introduction',
                })}
              </TitlePanel>
              <SelectionPanel
                id={INTRODUCTION_NOTEBOOK.id}
                title={INTRODUCTION_NOTEBOOK.title}
                description={INTRODUCTION_NOTEBOOK.description}
                onClick={onNotebookSelectionClick}
                isSelected={selectedNotebookId === INTRODUCTION_NOTEBOOK.id}
              />
              <TitlePanel>
                {i18n.translate('xpack.searchNotebooks.notebooksList.availableNotebooks.title', {
                  defaultMessage: 'Notebook previews',
                })}
              </TitlePanel>
              <NotebooksList
                notebooks={notebooks}
                selectedNotebookId={selectedNotebookId}
                onNotebookSelect={onNotebookSelectionClick}
              />
              <SearchLabsButtonPanel />
            </EuiFlexGroup>
          </EuiResizablePanel>

          <EuiResizableButton />

          <EuiResizablePanel
            id={OUTPUT_PANEL_ID}
            size={sizes[OUTPUT_PANEL_ID]}
            minSize="200px"
            tabIndex={0}
            paddingSize="none"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <TitlePanel>
                  {i18n.translate('xpack.searchNotebooks.notebooksList.activeNotebook.title', {
                    defaultMessage: 'Active notebook',
                  })}
                </TitlePanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <SearchNotebook notebookId={selectedNotebookId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
};
