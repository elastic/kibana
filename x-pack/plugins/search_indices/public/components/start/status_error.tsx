/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getErrorMessage } from '../../utils/errors';

export interface StartPageErrorProps {
  error: unknown;
}

export const StartPageError = ({ error }: StartPageErrorProps) => {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <h2>
          {i18n.translate('xpack.searchIndices.startPage.statusFetchError.title', {
            defaultMessage: 'Error loading indices',
          })}
        </h2>
      }
      body={
        <EuiCodeBlock css={{ textAlign: 'left' }}>
          {getErrorMessage(
            error,
            i18n.translate('xpack.searchIndices.startPage.statusFetchError.unknownError', {
              defaultMessage: 'Unknown error fetching indices.',
            })
          )}
        </EuiCodeBlock>
      }
    />
  );
};
