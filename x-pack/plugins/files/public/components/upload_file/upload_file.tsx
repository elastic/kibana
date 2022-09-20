/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useState, useRef, useEffect, useMemo } from 'react';
import { FileKind } from '../../../common';
import { FilesClient } from '../../types';

import { useFilesContext } from '../context';

import { UploadFile as Component } from './upload_file.component';
import { createUploadState } from './upload_state';
import { context } from './context';

/**
 * An object representing an uploadded file
 */
interface UploadedFile {
  /**
   * The ID that was generated for the uploaded file
   */
  id: string;
  /**
   * The kind of the file that was passed in to this component
   */
  kind: string;
}

/**
 * UploadFile component props
 */
export interface Props<Kind extends string = string> {
  /**
   * A file kind that should be registered during plugin startup. See {@link FileServiceStart}.
   */
  kind: Kind;
  /**
   * A files client that will be used process uploads.
   */
  client: FilesClient;
  /**
   * Allow users to clear a file after uploading.
   *
   * @note this will NOT delete an uploaded file.
   */
  allowClear?: boolean;
  /**
   * Start uploading the file as soon as it is provided
   * by the user.
   */
  immediate?: boolean;
  /**
   * Metadata that you want to associate with any uploaded files
   */
  meta?: Record<string, unknown>;
  /**
   * Whether this component should display a "done" state after processing an
   * upload or return to the initial state to allow for another upload.
   *
   * @default false
   */
  allowRepeatedUploads?: boolean;
  /**
   * Called when the an upload process fully completes
   */
  onDone: (files: UploadedFile[]) => void;

  /**
   * Called when an error occurs during upload
   */
  onError?: (e: Error) => void;
}

/**
 * This component is intended as a wrapper around EuiFilePicker with some opinions
 * about upload UX. It is optimised for use in modals, flyouts or forms.
 *
 * In order to use this component you must register your file kind with {@link FileKindsRegistry}
 */
export const UploadFile: FunctionComponent<Props> = ({
  meta,
  client,
  onDone,
  onError,
  allowClear,
  kind: kindId,
  immediate = false,
  allowRepeatedUploads = false,
}) => {
  const { registry } = useFilesContext();
  const ref = useRef<null | EuiFilePicker>(null);
  const [kind] = useState<FileKind>(() => registry.get(kindId));
  const uploadState = useMemo(
    () =>
      createUploadState({
        client,
        fileKind: kind,
        allowRepeatedUploads,
      }),
    [client, kind, allowRepeatedUploads]
  );

  useEffect(() => {
    const subs = [
      uploadState.clear$.subscribe(() => {
        ref.current?.removeFiles();
      }),
      uploadState.done$.subscribe((n) => n && onDone(n)),
      uploadState.error$.subscribe((e) => e && onError?.(e)),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [uploadState, onDone, onError]);

  return (
    <context.Provider value={uploadState}>
      <Component
        ref={ref}
        meta={meta}
        onCancel={uploadState.abort}
        onChange={(fs) => {
          uploadState.setFiles(fs);
          if (immediate) uploadState.upload(meta);
        }}
        onUpload={uploadState.upload}
        onClear={uploadState.clear}
        immediate={immediate}
        allowClear={allowClear}
      />
    </context.Provider>
  );
};

/* eslint-disable import/no-default-export */
export default UploadFile;
