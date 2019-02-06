/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';
import { WithSourceConfigurationFlyoutState } from '../../components/source_configuration/source_configuration_flyout_state';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';

interface InvalidNodeErrorProps {
  nodeName: string;
  intl: InjectedIntl;
}

const invalidNodeError: React.SFC<InvalidNodeErrorProps> = ({ nodeName, intl }) => (
  <WithKibanaChrome>
    {({ basePath }) => (
      <CenteredEmptyPrompt
        title={
          <h2>
            {intl.formatMessage(
              {
                id: 'xpack.infra.metrics.invalidNodeErrorTitle',
                defaultMessage: "Looks like {nodeName} isn't collecting any metrics data",
              },
              { nodeName }
            )}
          </h2>
        }
        body={
          <p>
            {intl.formatMessage({
              id: 'xpack.infra.metrics.invalidNodeErrorDescription',
              defaultMessage: 'Double check your configuration',
            })}
          </p>
        }
        actions={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                href={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
                color="primary"
                fill
              >
                {intl.formatMessage({
                  id: 'xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel',
                  defaultMessage: 'View setup instructions',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <WithSourceConfigurationFlyoutState>
                {({ enable }) => (
                  <EuiButton color="primary" onClick={enable}>
                    {intl.formatMessage({
                      id: 'xpack.infra.configureSourceActionLabel',
                      defaultMessage: 'Change source configuration',
                    })}
                  </EuiButton>
                )}
              </WithSourceConfigurationFlyoutState>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    )}
  </WithKibanaChrome>
);

export const InvalidNodeError = injectI18n(invalidNodeError);

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
