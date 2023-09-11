/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Integration } from '../../../../common/datasets';
import { ReloadIntegrations } from '../../../hooks/use_integrations';
import {
  errorLabel,
  noDataRetryLabel,
  noIntegrationsDescriptionLabel,
  noIntegrationsLabel,
} from '../constants';

export interface IntegrationsListStatusProps {
  integrations: Integration[] | null;
  error: Error | null;
  onRetry: ReloadIntegrations;
}

export const IntegrationsListStatus = ({
  integrations,
  error,
  onRetry,
}: IntegrationsListStatusProps) => {
  const isEmpty = integrations == null || integrations.length <= 0;
  const hasError = error !== null;

  if (hasError) {
    return (
      <EuiEmptyPrompt
        data-test-subj="integrationsErrorPrompt"
        iconType="warning"
        iconColor="danger"
        paddingSize="m"
        title={<h2>{noIntegrationsLabel}</h2>}
        titleSize="s"
        body={
          <FormattedMessage
            id="xpack.logExplorer.datasetSelector.noIntegrationsError"
            defaultMessage="An {error} occurred while getting your integrations. Please retry."
            values={{
              error: (
                <EuiToolTip content={error.message}>
                  <EuiText color="danger">{errorLabel}</EuiText>
                </EuiToolTip>
              ),
            }}
          />
        }
        actions={[<EuiButton onClick={onRetry}>{noDataRetryLabel}</EuiButton>]}
      />
    );
  }

  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        paddingSize="s"
        title={<h2>{noIntegrationsLabel}</h2>}
        titleSize="s"
        body={<p>{noIntegrationsDescriptionLabel}</p>}
      />
    );
  }

  return null;
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsListStatus;
