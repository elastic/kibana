/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useTrackPageview } from '../../../../../observability/public';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { Prompt } from '../../../utils/navigation_warning_prompt';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { LogSourceConfigurationFormErrors } from './source_configuration_form_errors';
import { useLogSourceConfigurationFormState } from './source_configuration_form_state';

export const LogsSettingsPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const shouldAllowEdit = uiCapabilities?.logs?.configureSource === true;

  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration',
    delay: 15000,
  });

  const {
    sourceConfiguration: source,
    hasFailedLoadingSource,
    isLoading,
    isUninitialized,
    updateSource,
    resolvedSourceConfiguration,
  } = useLogSourceContext();

  const availableFields = useMemo(
    () => resolvedSourceConfiguration?.fields.map((field) => field.name) ?? [],
    [resolvedSourceConfiguration]
  );

  const {
    sourceConfigurationFormElement,
    formState,
    logIndicesFormElement,
    logColumnsFormElement,
    nameFormElement,
    tiebreakerFieldFormElement,
    timestampFieldFormElement,
  } = useLogSourceConfigurationFormState(source?.configuration);

  const persistUpdates = useCallback(async () => {
    await updateSource(formState);
    sourceConfigurationFormElement.resetValue();
  }, [updateSource, sourceConfigurationFormElement, formState]);

  const isWriteable = useMemo(() => shouldAllowEdit && source && source.origin !== 'internal', [
    shouldAllowEdit,
    source,
  ]);

  if ((isLoading || isUninitialized) && !resolvedSourceConfiguration) {
    return <SourceLoadingPage />;
  }
  if (hasFailedLoadingSource) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <EuiPage style={{ flex: '1 0 0%' }}>
        <EuiPageBody data-test-subj="sourceConfigurationContent" restrictWidth>
          <EuiPageContentBody>
            <Prompt
              prompt={sourceConfigurationFormElement.isDirty ? unsavedFormPromptMessage : undefined}
            />
            <EuiPanel paddingSize="l">
              <NameConfigurationPanel
                isLoading={isLoading}
                isReadOnly={!isWriteable}
                nameFormElement={nameFormElement}
              />
            </EuiPanel>
            <EuiSpacer />
            <EuiPanel paddingSize="l">
              <IndicesConfigurationPanel
                isLoading={isLoading}
                isReadOnly={!isWriteable}
                indicesFormElement={logIndicesFormElement}
                tiebreakerFieldFormElement={tiebreakerFieldFormElement}
                timestampFieldFormElement={timestampFieldFormElement}
              />
            </EuiPanel>
            <EuiSpacer />
            <EuiPanel paddingSize="l">
              <LogColumnsConfigurationPanel
                availableFields={availableFields}
                isLoading={isLoading}
                logColumnsFormElement={logColumnsFormElement}
              />
            </EuiPanel>
            <EuiSpacer />
            {sourceConfigurationFormElement.validity.validity === 'invalid' ? (
              <>
                <LogSourceConfigurationFormErrors
                  errors={sourceConfigurationFormElement.validity.reasons}
                />
                <EuiSpacer />
              </>
            ) : null}
            <EuiFlexGroup>
              {isWriteable && (
                <EuiFlexItem>
                  {isLoading ? (
                    <EuiFlexGroup justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <EuiButton color="primary" isLoading fill>
                          Loading
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <>
                      <EuiFlexGroup justifyContent="flexEnd">
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="discardSettingsButton"
                            color="danger"
                            iconType="cross"
                            isDisabled={isLoading || !sourceConfigurationFormElement.isDirty}
                            onClick={() => {
                              sourceConfigurationFormElement.resetValue();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.infra.sourceConfiguration.discardSettingsButtonLabel"
                              defaultMessage="Discard"
                            />
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="applySettingsButton"
                            color="primary"
                            isDisabled={
                              !sourceConfigurationFormElement.isDirty ||
                              sourceConfigurationFormElement.validity.validity !== 'valid'
                            }
                            fill
                            onClick={persistUpdates}
                          >
                            <FormattedMessage
                              id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
                              defaultMessage="Apply"
                            />
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </>
                  )}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </EuiErrorBoundary>
  );
};

const unsavedFormPromptMessage = i18n.translate(
  'xpack.infra.logSourceConfiguration.unsavedFormPromptMessage',
  {
    defaultMessage: 'Are you sure you want to leave? Changes will be lost',
  }
);
