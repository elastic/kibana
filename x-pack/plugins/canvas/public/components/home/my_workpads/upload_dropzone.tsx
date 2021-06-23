/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
// @ts-expect-error untyped library
import Dropzone from 'react-dropzone';

import { useNotifyService } from '../../../services';
import { ErrorStrings } from '../../../../i18n';
import { useImportWorkpad, useCreateWorkpad } from '../hooks';
import { CanvasWorkpad } from '../../../../types';

import { UploadDropzone as Component } from './upload_dropzone.component';

const { WorkpadDropzone: errors } = ErrorStrings;

export const UploadDropzone: FC = ({ children }) => {
  const notify = useNotifyService();
  const uploadWorkpad = useImportWorkpad();
  const createWorkpad = useCreateWorkpad();
  const [isDisabled, setIsDisabled] = useState(false);

  const onComplete = async (workpad?: CanvasWorkpad) => {
    if (!workpad) {
      setIsDisabled(false);
      return;
    }

    await createWorkpad(workpad);
  };

  const onDrop = (files: FileList) => {
    if (!files) {
      return;
    }

    if (files.length > 1) {
      notify.warning(errors.getTooManyFilesErrorMessage());
      return;
    }

    setIsDisabled(true);
    uploadWorkpad(files[0], onComplete);
  };

  return (
    <Component disabled={isDisabled} {...{ onDrop }}>
      {children}
    </Component>
  );
};
