/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment } from 'react';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiProgress,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function JsonImportProgress({
  importStage = '',
  indexDataResp,
  indexPatternResp,
  complete = false,
}) {

  return (
    <Fragment>
      { !complete ? <EuiProgress size="xs" color="accent" position="absolute" /> : null }
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexNameLabel"
            defaultMessage="Indexing status"
          />
        }
      >
        <EuiText>
          {importStage}
        </EuiText>
      </EuiFormRow>
      <EuiSpacer size="m" />
      { complete
        ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.file_upload.indexNameLabel"
                defaultMessage="Index response"
              />
            }
          >
            <EuiCodeBlock
              paddingSize="s"
              overflowHeight={400}
            >
              {indexDataResp && JSON.stringify(indexDataResp)}
              {indexPatternResp && JSON.stringify(indexPatternResp)}
            </EuiCodeBlock>
          </EuiFormRow>
        )
        : null
      }
      <EuiSpacer size="s" />
    </Fragment>
  );
}
