/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useState, useRef } from 'react';
import { getFileKindsRegistry } from '../../../common/file_kinds_registry';
import { FilesClient } from '../../types';

import { useObservable } from '../use_observable';

import { UploadFileUI } from './upload_file_ui';
import { createUploadState } from './upload_state';

interface Props<Kind extends string = string> {
  client: FilesClient;
  fileKind: Kind;
  onDone: () => void;
}

export const UploadFile: FunctionComponent<Props> = ({ client, fileKind }) => {
  const [uploadState] = useState(() =>
    createUploadState({
      client,
      fileKind: getFileKindsRegistry().get(fileKind),
    })
  );

  const ref = useRef<null | EuiFilePicker>(null);

  const uploading = useObservable(uploadState.uploading$);

  const files = useObservable(uploadState.files$);
  const errors = files.map((f) => f.error);

  return (
    <UploadFileUI
      ref={ref}
      onCancel={uploadState.abort}
      onChange={uploadState.setFiles}
      onClear={() => {
        ref.current?.removeFiles();
        uploadState.setFiles([]);
      }}
      isInvalid={Boolean(errors.length)}
      onUpload={uploadState.upload}
      uploading={uploading}
    />
  );
};
