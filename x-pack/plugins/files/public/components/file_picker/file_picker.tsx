/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiButton,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { css } from '@emotion/react';
import { FilePickerContext } from './context';

import { useFilesContext } from '../context';
import { useFilePickerContext } from './context';
import { useBehaviorSubject } from '../use_behavior_subject';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';
import { FileGrid } from './components/file_grid';
import { i18nTexts } from './i18n_texts';

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
  const selectedFiles = useBehaviorSubject(state.fileIds$);
  const { status, error, data } = useQuery({
    queryFn: () => client.list({ kind, perPage }),
    retry: false,
  });
  const fixedWidth = Boolean(data?.files.length)
    ? css`
        width: 75vw;
      `
    : undefined;

  return (
    <EuiModal className="filesFilePicker" css={fixedWidth} maxWidth="75vw" onClose={onClose}>
      <EuiModalHeader>
        <Title />
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
      ) : data.files.length === 0 ? (
        <EuiModalBody>
          <UploadFilesPrompt kind={kind} />
        </EuiModalBody>
      ) : (
        <>
          <EuiModalBody>
            <FileGrid files={data.files} />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton disabled={!state.hasFilesSelected()} onClick={() => onDone(selectedFiles)}>
              {selectedFiles.length > 1
                ? i18nTexts.selectFilesLabel(selectedFiles.length)
                : i18nTexts.selectFileLabel}
            </EuiButton>
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
