/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useState, useRef, useEffect, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FileKind } from '../../../common';
import { FilesClient } from '../../types';

import { useFilesContext } from '../context';
import { useBehaviorSubject } from '../use_behavior_subject';

import { UploadFileUI } from './upload_file_ui';
import { createUploadState } from './upload_state';

export interface Props<Kind extends string = string> {
  kind: Kind;
  client: FilesClient;
  onDone: (files: Array<{ id: string; kind: string }>) => void;
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
  compressed?: boolean;
  onError?: (e: Error) => void;
}

/**
 * In order to use this component you must register your file kind with {@link FileKindsRegistry}
 */
export const UploadFile: FunctionComponent<Props> = ({
  client,
  onDone,
  onError,
  allowClear,
  compressed,
  kind: kindId,
  immediate = false,
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

  const clearFiles = () => {
    ref.current?.removeFiles();
    uploadState.setFiles([]);
  };

  const uploading = useBehaviorSubject(uploadState.uploading$);
  const files = useObservable(uploadState.files$, []);

  const errors = files.filter((f) => Boolean(f.error));
  const done = Boolean(files.length && files.every((f) => f.status === 'uploaded'));
  const retry = Boolean(files.some((f) => f.status === 'upload_failed'));

  const hasErrors = Boolean(errors.length);

  const upload = useCallback(() => {
    uploadState.upload().subscribe({
      complete: () => {
        onDone(files.map(({ id }) => ({ id: id!, kind: kindId })));
      },
      error: onError,
    });
  }, [onDone, onError, uploadState, files, kindId]);

  useEffect(() => {
    if (immediate && files.length && !uploading && !hasErrors) {
      upload();
    }
  }, [files, uploadState, upload, uploading, hasErrors, immediate]);

  return (
    <UploadFileUI
      ref={ref}
      immediate={immediate}
      onCancel={() => {
        uploadState.abort();
        if (immediate) clearFiles();
      }}
      onChange={uploadState.setFiles}
      ready={Boolean(files.length)}
      onClear={clearFiles}
      done={done}
      uploading={!done && uploading}
      retry={!done && retry}
      accept={kind.allowedMimeTypes?.join(',')}
      isInvalid={!uploading && hasErrors}
      allowClear={allowClear}
      errorMessage={errors[0]?.error?.message}
      display={compressed ? 'default' : 'large'}
      onUpload={upload}
    />
  );
};
