/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const FileUploadCallout = () => (
  <EuiCallOut
    title={i18n.translate('xpack.serverlessSearch.selectClient.fileUploadCallout.title', {
      defaultMessage: 'Upload your data from a file',
    })}
    size="m"
  >
    <p>
      <FormattedMessage
        id="xpack.serverlessSearch.selectClient.fileUploadCallout.description"
        defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
      />
    </p>
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton color="primary" fill data-test-subj="fileupload-callout-cta" onClick={() => {}}>
          {i18n.translate('xpack.serverlessSearch.selectClient.fileUploadCallout.cta', {
            defaultMessage: 'Upload a file',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);
