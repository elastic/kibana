/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useState, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { getFileKindsRegistry } from '../../../common/file_kinds_registry';
import { FilesClient } from '../../types';

import { useBehaviorSubject } from '../use_behavior_subject';

import { UploadFileUI } from './upload_file_ui';
import { createUploadState } from './upload_state';

export interface Props<Kind extends string = string> {
  kind: Kind;
  client: FilesClient;
  onDone: () => void;
}

/**
 * In order to use this component you must register your file kind with {@link FileKindsRegistry}
 */
export const UploadFile: FunctionComponent<Props> = ({ client, kind, onDone }) => {
  const [uploadState] = useState(() =>
    createUploadState({
      client,
      fileKind: getFileKindsRegistry().get(kind),
    })
  );

  const ref = useRef<null | EuiFilePicker>(null);

  const clearFiles = () => {
    ref.current?.removeFiles();
    uploadState.setFiles([]);
  };

  const uploading = useBehaviorSubject(uploadState.uploading$);
  const files = useObservable(uploadState.files$, []);
  const errors = files.filter((f) => Boolean(f.error));
  const done = Boolean(files.length && files.every((f) => f.status === 'uploaded'));

  return (
    <UploadFileUI
      ref={ref}
      onCancel={uploadState.abort}
      onChange={uploadState.setFiles}
      ready={Boolean(files.length)}
      onClear={clearFiles}
      done={done}
      isInvalid={Boolean(errors.length)}
      onUpload={() => uploadState.upload().subscribe()}
      uploading={uploading}
    />
  );
};
