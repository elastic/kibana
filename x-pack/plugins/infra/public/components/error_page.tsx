/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { euiStyled } from '../../../observability/public';
import { FlexPage } from './page';

interface Props {
  detailedMessage?: React.ReactNode;
  retry?: () => void;
  shortMessage: React.ReactNode;
}

export const ErrorPage: React.FC<Props> = ({ detailedMessage, retry, shortMessage }) => (
  <FlexPage>
    <EuiPageBody>
      <MinimumPageContent
        horizontalPosition="center"
        verticalPosition="center"
        panelPaddingSize="none"
      >
        <EuiPageContentBody>
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
            <EuiFlexGroup>
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
            {detailedMessage ? <div>{detailedMessage}</div> : null}
          </EuiCallOut>
        </EuiPageContentBody>
      </MinimumPageContent>
    </EuiPageBody>
  </FlexPage>
);

const MinimumPageContent = euiStyled(EuiPageContent)`
  min-width: 50vh;
`;
