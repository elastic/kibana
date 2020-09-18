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

import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { useSourceConfigurationFormState } from './source_configuration_form_state';
import { SourceLoadingPage } from '../source_loading_page';
import { Prompt } from '../../utils/navigation_warning_prompt';

interface SourceConfigurationSettingsProps {
  shouldAllowEdit: boolean;
}

export const SourceConfigurationSettings = ({
  shouldAllowEdit,
}: SourceConfigurationSettingsProps) => {
  const {
    createSourceConfiguration,
    source,
    sourceExists,
    isLoading,
    isUninitialized,
    updateSourceConfiguration,
  } = useContext(Source.Context);

  const {
    indicesConfigurationProps,
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

  if ((isLoading || isUninitialized) && !source) {
    return <SourceLoadingPage />;
  }
  if (!source?.configuration) {
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
            prompt={
              isFormDirty
                ? i18n.translate('xpack.infra.sourceConfiguration.unsavedFormPrompt', {
                    defaultMessage: 'Are you sure you want to leave? Changes will be lost',
                  })
                : undefined
            }
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
              metricAliasFieldProps={indicesConfigurationProps.metricAlias}
              readOnly={!isWriteable}
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
              timestampFieldProps={indicesConfigurationProps.timestampField}
            />
          </EuiPanel>
          <EuiSpacer />
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
