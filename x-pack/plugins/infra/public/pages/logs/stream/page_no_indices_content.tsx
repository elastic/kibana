/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { NoIndices } from '../../../components/empty_states/no_indices';
import { ViewSourceConfigurationButton } from '../../../components/source_configuration/view_source_configuration_button';

export const LogsPageNoIndicesContent = () => {
  const {
    services: { application },
  } = useKibana<{}>();

  const canConfigureSource = application?.capabilities?.logs?.configureSource ? true : false;

  const tutorialLinkProps = useLinkProps({
    app: 'integrations',
    hash: '/browse',
  });

  return (
    <NoIndices
      data-test-subj="noLogsIndicesPrompt"
      title={i18n.translate('xpack.infra.logsPage.noLoggingIndicesTitle', {
        defaultMessage: "Looks like you don't have any logging indices.",
      })}
      message={i18n.translate('xpack.infra.logsPage.noLoggingIndicesDescription', {
        defaultMessage: "Let's add some!",
      })}
      actions={
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              {...tutorialLinkProps}
              color="primary"
              fill
              data-test-subj="logsViewSetupInstructionsButton"
            >
              {i18n.translate('xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel', {
                defaultMessage: 'View setup instructions',
              })}
            </EuiButton>
          </EuiFlexItem>
          {canConfigureSource ? (
            <EuiFlexItem>
              <ViewSourceConfigurationButton app="logs" data-test-subj="configureSourceButton">
                {i18n.translate('xpack.infra.configureSourceActionLabel', {
                  defaultMessage: 'Change source configuration',
                })}
              </ViewSourceConfigurationButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
    />
  );
};
