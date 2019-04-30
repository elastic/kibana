/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo } from 'react';

import { FormattedMessage, injectI18n, InjectedIntl } from '@kbn/i18n/react';
import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { useIndicesConfigurationFormState } from './indices_configuration_form_state';
import { useLogColumnsConfigurationFormState } from './log_columns_configuration_form_state';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { SourceConfigurationFlyoutState } from './source_configuration_flyout_state';

const noop = () => undefined;

interface SourceConfigurationFlyoutProps {
  intl: InjectedIntl;
  shouldAllowEdit: boolean;
}

export const SourceConfigurationFlyout = injectI18n(
  ({ intl, shouldAllowEdit }: SourceConfigurationFlyoutProps) => {
    const { isVisible, hide } = useContext(SourceConfigurationFlyoutState.Context);

    const {
      createSourceConfiguration,
      source,
      sourceExists,
      isLoading,
      updateSourceConfiguration,
    } = useContext(Source.Context);
    const configuration = source && source.configuration;
    const availableFields = useMemo(
      () => (source && source.status ? source.status.indexFields.map(field => field.name) : []),
      [source]
    );

    const indicesConfigurationFormState = useIndicesConfigurationFormState({
      initialFormState: useMemo(
        () =>
          configuration
            ? {
                name: configuration.name,
                description: configuration.description,
                logAlias: configuration.logAlias,
                metricAlias: configuration.metricAlias,
                containerField: configuration.fields.container,
                hostField: configuration.fields.host,
                messageField: configuration.fields.message,
                podField: configuration.fields.pod,
                tiebreakerField: configuration.fields.tiebreaker,
                timestampField: configuration.fields.timestamp,
              }
            : undefined,
        [configuration]
      ),
    });
    const logColumnsConfigurationFormState = useLogColumnsConfigurationFormState({
      initialFormState: useMemo(
        () =>
          configuration
            ? {
                logColumns: configuration.logColumns,
              }
            : undefined,
        [configuration]
      ),
    });

    const errors = useMemo(
      () => [...indicesConfigurationFormState.errors, ...logColumnsConfigurationFormState.errors],
      [indicesConfigurationFormState.errors, logColumnsConfigurationFormState.errors]
    );

    const resetForms = useCallback(
      () => {
        indicesConfigurationFormState.resetForm();
        logColumnsConfigurationFormState.resetForm();
      },
      [indicesConfigurationFormState.resetForm, logColumnsConfigurationFormState.formState]
    );

    const isFormDirty = useMemo(
      () =>
        indicesConfigurationFormState.isFormDirty || logColumnsConfigurationFormState.isFormDirty,
      [indicesConfigurationFormState.isFormDirty, logColumnsConfigurationFormState.isFormDirty]
    );

    const isFormValid = useMemo(
      () =>
        indicesConfigurationFormState.isFormValid && logColumnsConfigurationFormState.isFormValid,
      [indicesConfigurationFormState.isFormValid, logColumnsConfigurationFormState.isFormValid]
    );

    const persistUpdates = useCallback(
      async () => {
        if (sourceExists) {
          await updateSourceConfiguration({
            name: indicesConfigurationFormState.formStateChanges.name,
            description: indicesConfigurationFormState.formStateChanges.description,
            logAlias: indicesConfigurationFormState.formStateChanges.logAlias,
            metricAlias: indicesConfigurationFormState.formStateChanges.metricAlias,
            fields: {
              container: indicesConfigurationFormState.formStateChanges.containerField,
              host: indicesConfigurationFormState.formStateChanges.hostField,
              pod: indicesConfigurationFormState.formStateChanges.podField,
              tiebreaker: indicesConfigurationFormState.formStateChanges.tiebreakerField,
              timestamp: indicesConfigurationFormState.formStateChanges.timestampField,
            },
            logColumns: logColumnsConfigurationFormState.formStateChanges.logColumns,
          });
        } else {
          await createSourceConfiguration({
            name: indicesConfigurationFormState.formState.name,
            description: indicesConfigurationFormState.formState.description,
            logAlias: indicesConfigurationFormState.formState.logAlias,
            metricAlias: indicesConfigurationFormState.formState.metricAlias,
            fields: {
              container: indicesConfigurationFormState.formState.containerField,
              host: indicesConfigurationFormState.formState.hostField,
              pod: indicesConfigurationFormState.formState.podField,
              tiebreaker: indicesConfigurationFormState.formState.tiebreakerField,
              timestamp: indicesConfigurationFormState.formState.timestampField,
            },
            logColumns: logColumnsConfigurationFormState.formState.logColumns,
          });
        }
        resetForms();
      },
      [
        sourceExists,
        updateSourceConfiguration,
        createSourceConfiguration,
        resetForms,
        indicesConfigurationFormState.formState,
        indicesConfigurationFormState.formStateChanges,
        logColumnsConfigurationFormState.formState,
        logColumnsConfigurationFormState.formStateChanges,
      ]
    );

    if (!isVisible || !configuration) {
      return null;
    }

    const tabs: EuiTabbedContentTab[] = [
      {
        id: 'indicesAndFieldsTab',
        name: intl.formatMessage({
          id: 'xpack.infra.sourceConfiguration.sourceConfigurationIndicesTabTitle',
          defaultMessage: 'Indices and fields',
        }),
        content: (
          <>
            <EuiSpacer />
            <NameConfigurationPanel
              isLoading={isLoading}
              nameFieldProps={indicesConfigurationFormState.fieldProps.name}
              readOnly={!shouldAllowEdit}
            />
            <EuiSpacer />
            <IndicesConfigurationPanel
              isLoading={isLoading}
              logAliasFieldProps={indicesConfigurationFormState.fieldProps.logAlias}
              metricAliasFieldProps={indicesConfigurationFormState.fieldProps.metricAlias}
              readOnly={!shouldAllowEdit}
            />
            <EuiSpacer />
            <FieldsConfigurationPanel
              containerFieldProps={indicesConfigurationFormState.fieldProps.containerField}
              hostFieldProps={indicesConfigurationFormState.fieldProps.hostField}
              isLoading={isLoading}
              podFieldProps={indicesConfigurationFormState.fieldProps.podField}
              readOnly={!shouldAllowEdit}
              tiebreakerFieldProps={indicesConfigurationFormState.fieldProps.tiebreakerField}
              timestampFieldProps={indicesConfigurationFormState.fieldProps.timestampField}
            />
          </>
        ),
      },
      {
        id: 'logsTab',
        name: intl.formatMessage({
          id: 'xpack.infra.sourceConfiguration.sourceConfigurationLogColumnsTabTitle',
          defaultMessage: 'Log Columns',
        }),
        content: (
          <>
            <EuiSpacer />
            <LogColumnsConfigurationPanel
              addLogColumn={logColumnsConfigurationFormState.addLogColumn}
              availableFields={availableFields}
              isLoading={isLoading}
              logColumnConfiguration={logColumnsConfigurationFormState.logColumnConfigurationProps}
            />
          </>
        ),
      },
    ];

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
          <EuiTabbedContent tabs={tabs} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
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
                    resetForms();
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
  }
);
