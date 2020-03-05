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
  EuiPanel,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useContext, useMemo } from 'react';
import { Prompt } from 'react-router-dom';

import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { useSourceConfigurationFormState } from './source_configuration_form_state';
import { SourceLoadingPage } from '../source_loading_page';

interface SourceConfigurationSettingsProps {
  shouldAllowEdit: boolean;
  displaySettings: 'metrics' | 'logs';
}

export const SourceConfigurationSettings = ({
  shouldAllowEdit,
  displaySettings,
}: SourceConfigurationSettingsProps) => {
  const {
    createSourceConfiguration,
    source,
    sourceExists,
    isLoading,
    updateSourceConfiguration,
  } = useContext(Source.Context);

  const availableFields = useMemo(
    () => (source && source.status ? source.status.indexFields.map(field => field.name) : []),
    [source]
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
    formState,
    formStateChanges,
  } = useSourceConfigurationFormState(source && source.configuration);

  const persistUpdates = useCallback(async () => {
    if (sourceExists) {
      await updateSourceConfiguration(formStateChanges);
    } else {
      await createSourceConfiguration(formState);
    }
    resetForm();
  }, [
    sourceExists,
    updateSourceConfiguration,
    createSourceConfiguration,
    resetForm,
    formState,
    formStateChanges,
  ]);

  const isWriteable = useMemo(() => shouldAllowEdit && source && source.origin !== 'internal', [
    shouldAllowEdit,
    source,
  ]);

  if (!source) {
    return <SourceLoadingPage />;
  }
  if (!source.configuration) {
    return null;
  }

  return (
    <>
      <EuiPage>
        <EuiPageBody
          className="eui-displayBlock"
          restrictWidth
          data-test-subj="sourceConfigurationContent"
        >
          <Prompt
            when={isFormDirty}
            message={i18n.translate('xpack.infra.sourceConfiguration.unsavedFormPrompt', {
              defaultMessage: 'Are you sure you want to leave? Changes will be lost',
            })}
          />
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
              metricAliasFieldProps={indicesConfigurationProps.metricAlias}
              readOnly={!isWriteable}
              displaySettings={displaySettings}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <FieldsConfigurationPanel
              containerFieldProps={indicesConfigurationProps.containerField}
              hostFieldProps={indicesConfigurationProps.hostField}
              isLoading={isLoading}
              podFieldProps={indicesConfigurationProps.podField}
              readOnly={!isWriteable}
              tiebreakerFieldProps={indicesConfigurationProps.tiebreakerField}
              timestampFieldProps={indicesConfigurationProps.timestampField}
              displaySettings={displaySettings}
            />
          </EuiPanel>
          <EuiSpacer />
          {displaySettings === 'logs' && (
            <EuiPanel paddingSize="l">
              <LogColumnsConfigurationPanel
                addLogColumn={addLogColumn}
                moveLogColumn={moveLogColumn}
                availableFields={availableFields}
                isLoading={isLoading}
                logColumnConfiguration={logColumnConfigurationProps}
              />
            </EuiPanel>
          )}
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
    </>
  );
};
