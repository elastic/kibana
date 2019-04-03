/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React, { useContext } from 'react';

import { NoIndices } from '../../components/empty_states/no_indices';
import { SourceConfigurationFlyoutState } from '../../components/source_configuration';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';

export const LogsPageNoIndicesContent = injectI18n(({ intl }) => {
  const { show } = useContext(SourceConfigurationFlyoutState.Context);

  return (
    <WithKibanaChrome>
      {({ basePath }) => (
        <NoIndices
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
                >
                  {intl.formatMessage({
                    id: 'xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel',
                    defaultMessage: 'View setup instructions',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton color="primary" onClick={show}>
                  {intl.formatMessage({
                    id: 'xpack.infra.configureSourceActionLabel',
                    defaultMessage: 'Change source configuration',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      )}
    </WithKibanaChrome>
  );
});
