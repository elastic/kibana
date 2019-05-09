/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React, { useContext } from 'react';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { NoIndices } from '../../components/empty_states/no_indices';
import { SourceConfigurationFlyoutState } from '../../components/source_configuration';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';

interface LogsPageNoIndicesContentProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const LogsPageNoIndicesContent = injectUICapabilities(
  injectI18n((props: LogsPageNoIndicesContentProps) => {
    const { intl, uiCapabilities } = props;
    const { showIndicesConfiguration } = useContext(SourceConfigurationFlyoutState.Context);

    return (
      <WithKibanaChrome>
        {({ basePath }) => (
          <NoIndices
            data-test-subj="noLogsIndicesPrompt"
            title={intl.formatMessage({
              id: 'xpack.infra.logsPage.noLoggingIndicesTitle',
              defaultMessage: "Looks like you don't have any logging indices.",
            })}
            message={intl.formatMessage({
              id: 'xpack.infra.logsPage.noLoggingIndicesDescription',
              defaultMessage: "Let's add some!",
            })}
            actions={
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton
                    href={`${basePath}/app/kibana#/home/tutorial_directory/logging`}
                    color="primary"
                    fill
                    data-test-subj="logsViewSetupInstructionsButton"
                  >
                    {intl.formatMessage({
                      id: 'xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel',
                      defaultMessage: 'View setup instructions',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                {uiCapabilities.logs.configureSource ? (
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="configureSourceButton"
                      color="primary"
                      onClick={showIndicesConfiguration}
                    >
                      {intl.formatMessage({
                        id: 'xpack.infra.configureSourceActionLabel',
                        defaultMessage: 'Change source configuration',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            }
          />
        )}
      </WithKibanaChrome>
    );
  })
);
