/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
interface IndexloadingErrorProps {
  indexName: string;
  navigateToIndexListPage: () => void;
  reloadFunction: () => void;
}
export const IndexloadingError = ({
  indexName,
  navigateToIndexListPage,
  reloadFunction,
}: IndexloadingErrorProps) => (
  <EuiPageTemplate.EmptyPrompt
    data-test-subj="pageLoadError"
    color="danger"
    iconType="warning"
    title={
      <h2>
        <FormattedMessage
          id="xpack.searchIndices.pageLoaError.errorTitle"
          defaultMessage="Unable to load index details"
        />
      </h2>
    }
    body={
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.searchIndices.pageLoadError.description"
          defaultMessage="We encountered an error loading data for index {indexName}. Make sure that the index name in the URL is correct and try again."
          values={{
            indexName,
          }}
        />
      </EuiText>
    }
    actions={
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="danger"
            iconType="arrowLeft"
            onClick={() => navigateToIndexListPage()}
            data-test-subj="loadingErrorBackToIndicesButton"
          >
            <FormattedMessage
              id="xpack.searchIndices.pageLoadError.backToIndicesButtonLabel"
              defaultMessage="Back to indices"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconSide="right"
            onClick={reloadFunction}
            iconType="refresh"
            color="danger"
            data-test-subj="reloadButton"
          >
            <FormattedMessage
              id="xpack.searchIndices.pageLoadError.reloadButtonLabel"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);
