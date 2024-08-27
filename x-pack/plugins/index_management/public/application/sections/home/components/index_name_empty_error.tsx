/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiText, EuiCode } from '@elastic/eui';

export const DetailsPageNoIndexNameError: React.FC = () => {
  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="indexDetailsNoIndexNameError"
      color="danger"
      iconType="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.noIndexNameErrorTitle"
            defaultMessage="Unable to load index details"
          />
        </h2>
      }
      body={
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.noIndexNameErrorDescription"
            defaultMessage="An index name is required for this page. Add a query parameter {queryParam} followed by an index name to the url."
            values={{
              queryParam: <EuiCode>indexName</EuiCode>,
            }}
          />
        </EuiText>
      }
    />
  );
};
