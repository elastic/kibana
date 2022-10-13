/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';

import { useBehaviorSubject } from '../use_behavior_subject';
import { useFilePickerContext, FilePickerContext } from './context';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';
import { FileGrid } from './components/file_grid';
import { SearchField } from './components/search_field';
import { SelectButton } from './components/select_button';
import { Pagination } from './components/pagination';

import './file_picker.scss';
import { ClearFilterButton } from './components/clear_filter_button';

export interface Props<Kind extends string = string> {
  /**
   * The file kind that was passed to the registry.
   */
  kind: Kind;
  /**
   * Will be called when the modal is closed
   */
  onClose: () => void;
  /**
   * Will be called after a user has a selected a set of files
   */
  onDone: (fileIds: string[]) => void;
  /**
   * The number of results to show per page.
   */
  pageSize?: number;
}

const Component: FunctionComponent<Props> = ({ onClose, onDone }) => {
  const { state, kind } = useFilePickerContext();

  const hasFiles = useBehaviorSubject(state.hasFiles$);
  const isLoading = useBehaviorSubject(state.isLoading$);
  const error = useBehaviorSubject(state.loadingError$);

  useEffect(() => {
    state.loadFiles();
  }, [state]);

  return (
    <EuiModal className="filesFilePicker filesFilePicker--fixed" maxWidth="75vw" onClose={onClose}>
      <EuiModalHeader>
        <Title />
        {hasFiles && <SearchField />}
      </EuiModalHeader>
      {isLoading ? (
        <EuiModalBody>
          <EuiLoadingSpinner size="xl" />
        </EuiModalBody>
      ) : Boolean(error) ? (
        <EuiModalBody>
          <ErrorContent onRetry={state.loadFiles} error={error as Error} />
        </EuiModalBody>
      ) : !hasFiles ? (
        <EuiModalBody>
          <UploadFilesPrompt kind={kind} />
        </EuiModalBody>
      ) : (
        <>
          <EuiModalBody>
            <FileGrid />
            <EuiSpacer />
            <ClearFilterButton onClick={() => state.setQuery(undefined)} />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
              <Pagination />
              <SelectButton onClick={onDone} />
            </EuiFlexGroup>
          </EuiModalFooter>
        </>
      )}
    </EuiModal>
  );
};

export const FilePicker: FunctionComponent<Props> = (props) => (
  <FilePickerContext pageSize={props.pageSize ?? 20} kind={props.kind}>
    <Component {...props} />
  </FilePickerContext>
);
