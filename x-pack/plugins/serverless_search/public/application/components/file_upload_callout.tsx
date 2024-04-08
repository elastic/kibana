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

import { useKibanaServices } from '../hooks/use_kibana';
import { FILE_UPLOAD_PATH } from '../constants';

export const FileUploadCallout = () => {
  const {
    application: { navigateToUrl },
    http,
  } = useKibanaServices();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.serverlessSearch.selectClient.fileUploadCallout.title', {
        defaultMessage: 'Upload your data from a file',
      })}
      size="s"
      iconType="iInCircle"
    >
      <p>
        <FormattedMessage
          id="xpack.serverlessSearch.selectClient.fileUploadCallout.description"
          defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
        />
      </p>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            iconType="exportAction"
            data-test-subj="fileupload-callout-cta"
            onClick={() => navigateToUrl(http.basePath.prepend(FILE_UPLOAD_PATH))}
          >
            {i18n.translate('xpack.serverlessSearch.selectClient.fileUploadCallout.cta', {
              defaultMessage: 'Upload a file',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
