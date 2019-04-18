/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { SourceConfigurationFlyoutState } from './source_configuration_flyout_state';
import { useSourceConfigurationFormState } from './source_configuration_form_state';

const noop = () => undefined;

interface SourceConfigurationFlyoutProps {
  shouldAllowEdit: boolean;
}

export const SourceConfigurationFlyout: React.FunctionComponent<
  SourceConfigurationFlyoutProps
> = props => {
  const { shouldAllowEdit } = props;
  const { isVisible, hide } = useContext(SourceConfigurationFlyoutState.Context);

  const {
    createSourceConfiguration,
    source,
    sourceExists,
    isLoading,
    updateSourceConfiguration,
  } = useContext(Source.Context);

  const configuration = source && source.configuration;
  const initialFormState = useMemo(
    () =>
      configuration
        ? {
            name: configuration.name,
            description: configuration.description,
            fields: {
              container: configuration.fields.container,
              host: configuration.fields.host,
              message: configuration.fields.message,
              pod: configuration.fields.pod,
              tiebreaker: configuration.fields.tiebreaker,
              timestamp: configuration.fields.timestamp,
            },
            logAlias: configuration.logAlias,
            metricAlias: configuration.metricAlias,
          }
        : defaultFormState,
    [configuration]
  );

  const {
    fieldProps,
    formState,
    isFormDirty,
    isFormValid,
    resetForm,
    updates,
  } = useSourceConfigurationFormState({
    initialFormState,
  });

  const persistUpdates = useCallback(
    async () => {
      if (sourceExists) {
        await updateSourceConfiguration(updates);
      } else {
        await createSourceConfiguration(formState);
      }
      resetForm();
    },
    [sourceExists, updateSourceConfiguration, createSourceConfiguration, resetForm, formState]
  );

  if (!isVisible || !configuration) {
    return null;
  }

  return (
    <EuiFlyout
      aria-labelledby="sourceConfigurationTitle"
      data-test-subj="sourceConfigurationFlyout"
      hideCloseButton
      onClose={noop}
    >
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id="sourceConfigurationTitle">
            {shouldAllowEdit ? (
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.sourceConfigurationTitle"
                defaultMessage="Configure source"
              />
            ) : (
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.sourceConfigurationReadonlyTitle"
                defaultMessage="View source configuration"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <NameConfigurationPanel
          isLoading={isLoading}
          readOnly={!shouldAllowEdit}
          nameFieldProps={fieldProps.name}
        />
        <EuiSpacer />
        <IndicesConfigurationPanel
          isLoading={isLoading}
          readOnly={!shouldAllowEdit}
          logAliasFieldProps={fieldProps.logAlias}
          metricAliasFieldProps={fieldProps.metricAlias}
        />
        <EuiSpacer />
        <FieldsConfigurationPanel
          containerFieldProps={fieldProps.containerField}
          hostFieldProps={fieldProps.hostField}
          isLoading={isLoading}
          readOnly={!shouldAllowEdit}
          podFieldProps={fieldProps.podField}
          tiebreakerFieldProps={fieldProps.tiebreakerField}
          timestampFieldProps={fieldProps.timestampField}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            {!isFormDirty ? (
              <EuiButtonEmpty
                data-test-subj="closeFlyoutButton"
                iconType="cross"
                isDisabled={isLoading}
                onClick={() => hide()}
              >
                <FormattedMessage
                  id="xpack.infra.sourceConfiguration.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                data-test-subj="discardAndCloseFlyoutButton"
                color="danger"
                iconType="cross"
                isDisabled={isLoading}
                onClick={() => {
                  resetForm();
                  hide();
                }}
              >
                <FormattedMessage
                  id="xpack.infra.sourceConfiguration.discardAndCloseButtonLabel"
                  defaultMessage="Discard and Close"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem />
          {shouldAllowEdit && (
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiButton color="primary" isLoading fill>
                  Loading
                </EuiButton>
              ) : (
                <EuiButton
                  data-test-subj="updateSourceConfigurationButton"
                  color="primary"
                  isDisabled={!isFormDirty || !isFormValid}
                  fill
                  onClick={persistUpdates}
                >
                  <FormattedMessage
                    id="xpack.infra.sourceConfiguration.updateSourceConfigurationButtonLabel"
                    defaultMessage="Update Source"
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const defaultFormState = {
  name: '',
  description: '',
  fields: {
    container: '',
    host: '',
    message: [],
    pod: '',
    tiebreaker: '',
    timestamp: '',
  },
  logAlias: '',
  metricAlias: '',
};
