/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';

export const DetailsPageError = ({
  indexName,
  resendRequest,
}: {
  indexName: string;
  resendRequest: () => Promise<void>;
}) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="indexDetailsErrorLoadingDetails"
      color="danger"
      iconType="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.errorTitle"
            defaultMessage="Unable to load index details"
          />
        </h2>
      }
      body={
        <>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.errorDescription"
              defaultMessage="We encountered an error loading data for index {indexName}. Make sure that the index name in the URL is correct and try again."
              values={{
                indexName,
              }}
            />
          </EuiText>
          <EuiSpacer />
          <EuiButton
            iconSide="right"
            onClick={resendRequest}
            iconType="refresh"
            color="danger"
            data-test-subj="indexDetailsReloadDetailsButton"
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.reloadButtonLabel"
              defaultMessage="Reload"
            />
          </EuiButton>
        </>
      }
    />
  );
};
