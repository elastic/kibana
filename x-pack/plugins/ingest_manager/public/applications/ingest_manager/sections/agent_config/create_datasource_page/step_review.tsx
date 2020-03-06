/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import { NewDatasource } from '../../../types';

export const StepReviewDatasource: React.FunctionComponent<{
  datasource: NewDatasource;
  cancelUrl: string;
  onSubmit: () => void;
  isSubmitLoading: boolean;
}> = ({ cancelUrl, onSubmit, isSubmitLoading }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={cancelUrl}>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.cancelLinkText"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onSubmit()}
              isLoading={isSubmitLoading}
              disabled={isSubmitLoading}
            >
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.addDatasourceButtonText"
                defaultMessage="Add datasource to package"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
