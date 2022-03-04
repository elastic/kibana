/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { ViewSourceConfigurationButton } from '../../../../components/source_configuration/view_source_configuration_button';
import { useLinkProps } from '../../../../../../observability/public';

interface InvalidNodeErrorProps {
  nodeName: string;
}

export const InvalidNodeError: React.FunctionComponent<InvalidNodeErrorProps> = ({ nodeName }) => {
  const tutorialLinkProps = useLinkProps({
    app: 'integrations',
    hash: '/browse',
  });

  return (
    <CenteredEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.infra.metrics.invalidNodeErrorTitle"
            defaultMessage="Looks like {nodeName} isn't collecting any metrics data"
            values={{
              nodeName,
            }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.infra.metrics.invalidNodeErrorDescription"
            defaultMessage="Double check your configuration"
          />
        </p>
      }
      actions={
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton {...tutorialLinkProps} color="primary" fill>
              <FormattedMessage
                id="xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel"
                defaultMessage="View setup instructions"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <ViewSourceConfigurationButton app="metrics" data-test-subj="configureSourceButton">
              <FormattedMessage
                id="xpack.infra.configureSourceActionLabel"
                defaultMessage="Change source configuration"
              />
            </ViewSourceConfigurationButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

const CenteredEmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
