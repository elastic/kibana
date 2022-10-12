/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { UploadFile } from '../../upload_file';
import { useFilePickerContext } from '../context';
import { i18nTexts } from '../i18n_texts';

interface Props {
  kind: string;
}

export const UploadFilesPrompt: FunctionComponent<Props> = ({ kind }) => {
  const { state } = useFilePickerContext();
  return (
    <UploadFile
      kind={kind}
      immediate
      onDone={(file) => state.selectFile(file.map(({ id }) => id))}
      initialPromptText={i18nTexts.emptyStatePrompt}
    />
  );
};
