/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classnames from 'classnames';
import React, { useEffect } from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { css } from '@emotion/react';
import { FilePickerContext } from './context';

import { useFilesContext } from '../context';
import { useFilePickerContext } from './context';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';
import { FileGrid } from './components/file_grid';
import { SearchField } from './components/search_field';
import { SelectButton } from './components/select_button';
import { useBehaviorSubject } from '../use_behavior_subject';

import './file_picker.scss';

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
  perPage?: number;
}

const Component: FunctionComponent<Props> = ({ perPage, onClose, onDone }) => {
  const { client } = useFilesContext();
  const { state, kind } = useFilePickerContext();
  const { status, error, data } = useQuery({
    queryFn: () => client.list({ kind, perPage }),
    retry: false,
  });

  const hasFiles = useBehaviorSubject(state.hasFiles$);

  useEffect(() => {
    if (data?.files.length) state.setFiles(data.files);
  }, [data, state]);

  useEffect(() => () => state.dispose(), [state]);

  return (
    <EuiModal
      className={classnames('filesFilePicker', { ['filesFilePicker--fixed']: hasFiles })}
      maxWidth="75vw"
      onClose={onClose}
    >
      <EuiModalHeader>
        <Title />
        {hasFiles && <SearchField onChange={state.setQuery} />}
      </EuiModalHeader>
      {status === 'loading' ? (
        <EuiModalBody
          css={css`
            place-self: center stretch;
          `}
        >
          <EuiLoadingSpinner size="xl" />
        </EuiModalBody>
      ) : status === 'error' ? (
        <EuiModalBody
          css={css`
            place-self: center stretch;
          `}
        >
          <ErrorContent error={error as Error} />
        </EuiModalBody>
      ) : !hasFiles ? (
        <EuiModalBody>
          <UploadFilesPrompt kind={kind} />
        </EuiModalBody>
      ) : (
        <>
          <EuiModalBody>
            <FileGrid />
          </EuiModalBody>
          <EuiModalFooter>
            <SelectButton onClick={onDone} />
          </EuiModalFooter>
        </>
      )}
    </EuiModal>
  );
};

export const FilePicker: FunctionComponent<Props> = (props) => (
  <FilePickerContext kind={props.kind}>
    <Component {...props} />
  </FilePickerContext>
);
