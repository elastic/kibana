/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useState, useRef, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { finalize } from 'rxjs';
import { FileKind } from '../../../common';
import { FilesClient } from '../../types';

import { useFilesContext } from '../context';
import { useBehaviorSubject } from '../use_behavior_subject';

import { UploadFileUI } from './components';
import { createUploadState } from './upload_state';

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
  const [uploadState] = useState(() =>
    createUploadState({
      client,
      fileKind: kind,
    })
  );

  const uploading = useBehaviorSubject(uploadState.uploading$);
  const files = useObservable(uploadState.files$, []);

  const errors = files.filter((f) => Boolean(f.error));
  const done = Boolean(files.length && files.every((f) => f.status === 'uploaded'));
  const retry = Boolean(files.some((f) => f.status === 'upload_failed'));

  const hasErrors = Boolean(errors.length);

  const clearFiles = useCallback(() => {
    ref.current?.removeFiles();
    uploadState.setFiles([]);
  }, [uploadState]);

  const upload = useCallback(() => {
    uploadState
      .upload(meta)
      .pipe(
        finalize(() => {
          if (allowRepeatedUploads) clearFiles();
        })
      )
      .subscribe({
        complete: () => {
          onDone(files.map(({ id }) => ({ id: id!, kind: kindId })));
        },
        error: onError,
      });
  }, [onDone, onError, uploadState, files, kindId, meta, allowRepeatedUploads, clearFiles]);

  return (
    <UploadFileUI
      ref={ref}
      ready={Boolean(files.length)}
      immediate={immediate}
      onCancel={() => {
        uploadState.abort();
        if (immediate) clearFiles();
      }}
      onChange={(fs) => {
        uploadState.setFiles(fs);
        if (immediate) upload();
      }}
      onUpload={upload}
      onClear={clearFiles}
      done={done}
      uploading={!done && uploading}
      retry={!done && retry}
      accept={kind.allowedMimeTypes?.join(',')}
      isInvalid={!uploading && hasErrors}
      allowClear={allowClear}
      errorMessage={errors[0]?.error?.message}
    />
  );
};

/* eslint-disable import/no-default-export */
export default UploadFile;
