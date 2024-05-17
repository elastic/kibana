/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useHistory } from 'react-router-dom';

export const NotFoundPage = () => {
  const history = useHistory();
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel>
          <EuiEmptyPrompt
            iconType="faceNeutral"
            iconColor="subdued"
            title={
              <EuiTitle size="m">
                <h3>
                  <FormattedMessage
                    defaultMessage="Page not found"
                    id="xpack.uptime.emptyStateError.notFoundPage"
                  />
                </h3>
              </EuiTitle>
            }
            body={
              <EuiButton
                data-test-subj="syntheticsNotFoundPageBackToHomeButton"
                href={history.createHref({ pathname: '/' })}
              >
                <FormattedMessage
                  defaultMessage="Back to home"
                  id="xpack.uptime.notFountPage.homeLinkText"
                />
              </EuiButton>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
