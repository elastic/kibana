/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PageTemplate } from './page_template';

interface Props {
  detailedMessage?: React.ReactNode;
  retry?: () => void;
  shortMessage: React.ReactNode;
}

// Represents a fully constructed page, including page template.
export const ErrorPage: React.FC<Props> = ({ detailedMessage, retry, shortMessage }) => {
  return (
    <PageTemplate isEmptyState={true}>
      <EuiCallOut
        color="danger"
        iconType="cross"
        title={
          <FormattedMessage
            id="xpack.infra.errorPage.errorOccurredTitle"
            defaultMessage="An error occurred"
          />
        }
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>{shortMessage}</EuiFlexItem>
          {retry ? (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={retry} iconType="refresh">
                <FormattedMessage
                  id="xpack.infra.errorPage.tryAgainButtonLabel"
                  defaultMessage="Try again"
                />
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {detailedMessage ? (
          <>
            <EuiSpacer />
            <div>{detailedMessage}</div>
          </>
        ) : null}
      </EuiCallOut>
    </PageTemplate>
  );
};
