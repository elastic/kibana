/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { css } from '@emotion/react';
import { FilePickerContext } from './context';

import { useFilesContext } from '../context';
import { useFilePickerContext } from './context';
import { useBehaviorSubject } from '../use_behavior_subject';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';
import * as layout from './components/layout';

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

  return (
    <layout.Grid>
      <layout.Header
        css={css`
          place-self: center start;
        `}
      >
        <Title />
      </layout.Header>
      {status === 'loading' ? (
        <layout.ContentAndFooter
          css={css`
            place-self: center stretch;
          `}
        >
          <EuiLoadingSpinner size="xl" />
        </layout.ContentAndFooter>
      ) : status === 'error' ? (
        <layout.ContentAndFooter
          css={css`
            place-self: center stretch;
          `}
        >
          <ErrorContent error={error as Error} />
        </layout.ContentAndFooter>
      ) : data.files.length === 0 ? (
        <layout.ContentAndFooter
          css={css`
            place-self: center stretch;
          `}
        >
          <UploadFilesPrompt kind={kind} />
        </layout.ContentAndFooter>
      ) : (
        <>
          <layout.Content
            css={css`
              grid-area: content;
            `}
          >
            {
              // TODO actually make some content here
              'OK'
            }
          </layout.Content>
          <layout.Footer
            css={css`
              grid-area: footer;
              place-self: center end;
            `}
          >
            <EuiButton disabled={!state.hasFilesSelected()}>Select file(s)</EuiButton>
          </layout.Footer>
        </>
      )}
    </layout.Grid>
  );
};

export const FilePicker: FunctionComponent<Props> = (props) => (
  <FilePickerContext>
    <Component {...props} />
  </FilePickerContext>
);
