/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiButton, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { css } from '@emotion/react';
import { FilePickerContext } from './context';

import { useFilesContext } from '../context';
import { useFilePickerContext } from './context';
import { useBehaviorSubject } from '../use_behavior_subject';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';

export interface Props<Kind extends string = string> {
  /**
   * The file kind that was passed to the registry.
   */
  kind: Kind;
  /**
   * The number of results to show per page.
   */
  perPage?: number;
}

const Component: FunctionComponent<Props> = ({ kind, perPage }) => {
  const { client } = useFilesContext();
  const { state } = useFilePickerContext();
  const selectedFiles = useBehaviorSubject(state.fileIds$);
  const { status, error, data } = useQuery({
    queryFn: () => client.list({ kind, perPage }),
    retry: false,
  });
  const { euiTheme } = useEuiTheme();

  const hasFilesSelected = Boolean(selectedFiles.length);

  return (
    <div
      css={css`
        display: grid;
        place-items: center;
        grid-template-columns: ${euiTheme.size.m} 1fr 2fr 1fr ${euiTheme.size.m};
        grid-template-rows: 1fr ${euiTheme.size.m} 3fr 1fr;
        grid-template-areas:
          '. title title . .'
          '. . . . .'
          '. content content content .'
          '. footer footer footer .';
      `}
    >
      <div
        css={css`
          grid-area: title;
          place-self: center start;
        `}
      >
        <Title />
      </div>
      <div
        css={css`
          grid-area: content;
          place-self: center stretch;
        `}
      >
        {status === 'loading' ? (
          <EuiLoadingSpinner size="xl" />
        ) : status === 'error' ? (
          <ErrorContent error={error as Error} />
        ) : data.files.length === 0 ? (
          <UploadFilesPrompt kind={kind} />
        ) : (
          // TODO actually make some content here
          'OK'
        )}
      </div>
      <div
        css={css`
          grid-area: footer;
          place-self: center end;
        `}
      >
        <EuiButton disabled={!hasFilesSelected}>Select file(s)</EuiButton>
      </div>
    </div>
  );
};

export const FilePicker: FunctionComponent<Props> = (props) => (
  <FilePickerContext>
    <Component {...props} />
  </FilePickerContext>
);
