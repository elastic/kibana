/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiCodeBlock, EuiCallOut, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ExampleDocumentJsonProps {
  document: object;
  errors?: string[];
}
export const ExampleDocumentJson: React.FC<ExampleDocumentJsonProps> = ({ document, errors }) => {
  return (
    <>
      {errors && (
        <>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.documentNotIndexed',
                { defaultMessage: 'This document was not indexed!' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {errors.map((errorMessage, index) => (
            <Fragment key={index}>
              <EuiCallOut color="danger" size="s" title={errorMessage} />
              <EuiSpacer size="s" />
            </Fragment>
          ))}
        </>
      )}
      <EuiCodeBlock language="json" paddingSize="m" overflowHeight={200}>
        {JSON.stringify(document, null, 2)}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
    </>
  );
};

interface MoreDocumentsTextProps {
  documents: number;
}
export const MoreDocumentsText: React.FC<MoreDocumentsTextProps> = ({ documents }) => {
  return (
    <EuiText>
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.otherDocuments',
          {
            defaultMessage:
              'and {documents, number} other {documents, plural, one {document} other {documents}}.',
            values: { documents },
          }
        )}
      </p>
    </EuiText>
  );
};
