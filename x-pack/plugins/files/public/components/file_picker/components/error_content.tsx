/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

interface Props {
  error: Error;
}

export const ErrorContent: FunctionComponent<Props> = ({ error }) => {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={<h2>{i18nTexts.loadingFilesErrorTitle}</h2>}
      body={error.message}
    />
  );
};
