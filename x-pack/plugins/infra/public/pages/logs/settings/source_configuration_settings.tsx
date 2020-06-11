/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from '../../../components/source_configuration/name_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { useLogSourceConfigurationFormState } from './source_configuration_form_state';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { Prompt } from '../../../utils/navigation_warning_prompt';

export const LogsSettingsPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const shouldAllowEdit = uiCapabilities?.logs?.configureSource === true;

  const {
    sourceConfiguration: source,
    sourceStatus,
    isLoading,
    isUninitialized,
    updateSourceConfiguration,
  } = useLogSourceContext();

  const availableFields = useMemo(
    () => sourceStatus?.logIndexFields.map((field) => field.name) ?? [],
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [sourceStatus]
  );

  const {
    addLogColumn,
    moveLogColumn,
    indicesConfigurationProps,
    logColumnConfigurationProps,
    errors,
    resetForm,
    isFormDirty,
    isFormValid,
    formStateChanges,
  } = useLogSourceConfigurationFormState(source?.configuration);

  const persistUpdates = useCallback(async () => {
    await updateSourceConfiguration(formStateChanges);
    resetForm();
  }, [updateSourceConfiguration, resetForm, formStateChanges]);

  const isWriteable = useMemo(() => shouldAllowEdit && source && source.origin !== 'internal', [
    shouldAllowEdit,
    source,
  ]);

  if ((isLoading || isUninitialized) && !source) {
    return <SourceLoadingPage />;
  }
  if (!source?.configuration) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <EuiPage>
        <EuiPageBody
          className="eui-displayBlock"
          restrictWidth
          data-test-subj="sourceConfigurationContent"
        >
          <Prompt prompt={isFormDirty ? unsavedFormPromptMessage : undefined} />
          <EuiPanel paddingSize="l">
            <NameConfigurationPanel
              isLoading={isLoading}
              nameFieldProps={indicesConfigurationProps.name}
              readOnly={!isWriteable}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <IndicesConfigurationPanel
              isLoading={isLoading}
              logAliasFieldProps={indicesConfigurationProps.logAlias}
              readOnly={!isWriteable}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <FieldsConfigurationPanel
              isLoading={isLoading}
              readOnly={!isWriteable}
              tiebreakerFieldProps={indicesConfigurationProps.tiebreakerField}
              timestampFieldProps={indicesConfigurationProps.timestampField}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <LogColumnsConfigurationPanel
              addLogColumn={addLogColumn}
              moveLogColumn={moveLogColumn}
              availableFields={availableFields}
              isLoading={isLoading}
              logColumnConfiguration={logColumnConfigurationProps}
            />
          </EuiPanel>
          {errors.length > 0 ? (
            <>
              <EuiCallOut color="danger">
                <ul>
                  {errors.map((error, errorIndex) => (
                    <li key={errorIndex}>{error}</li>
                  ))}
                </ul>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiSpacer size="m" />
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
                          isDisabled={isLoading || !isFormDirty}
                          onClick={() => {
                            resetForm();
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
                          isDisabled={!isFormDirty || !isFormValid}
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
