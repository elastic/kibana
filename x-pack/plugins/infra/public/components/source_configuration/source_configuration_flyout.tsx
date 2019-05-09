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
import { FormattedMessage, injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React, { useCallback, useContext, useMemo } from 'react';

import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { isValidTabId, SourceConfigurationFlyoutState } from './source_configuration_flyout_state';
import { useSourceConfigurationFormState } from './source_configuration_form_state';

const noop = () => undefined;

interface SourceConfigurationFlyoutProps {
  intl: InjectedIntl;
  shouldAllowEdit: boolean;
}

export const SourceConfigurationFlyout = injectI18n(
  ({ intl, shouldAllowEdit }: SourceConfigurationFlyoutProps) => {
    const { activeTabId, hide, isVisible, setActiveTab } = useContext(
      SourceConfigurationFlyoutState.Context
    );

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
      indicesConfigurationProps,
      logColumnConfigurationProps,
      errors,
      resetForm,
      isFormDirty,
      isFormValid,
      formState,
      formStateChanges,
    } = useSourceConfigurationFormState(source && source.configuration);

    const persistUpdates = useCallback(
      async () => {
        if (sourceExists) {
          await updateSourceConfiguration(formStateChanges);
        } else {
          await createSourceConfiguration(formState);
        }
        resetForm();
      },
      [
        sourceExists,
        updateSourceConfiguration,
        createSourceConfiguration,
        resetForm,
        formState,
        formStateChanges,
      ]
    );

    const isWriteable = useMemo(() => shouldAllowEdit && source && source.origin !== 'internal', [
      shouldAllowEdit,
      source,
    ]);

    const tabs: EuiTabbedContentTab[] = useMemo(
      () =>
        isVisible
          ? [
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
                      nameFieldProps={indicesConfigurationProps.name}
                      readOnly={!isWriteable}
                    />
                    <EuiSpacer />
                    <IndicesConfigurationPanel
                      isLoading={isLoading}
                      logAliasFieldProps={indicesConfigurationProps.logAlias}
                      metricAliasFieldProps={indicesConfigurationProps.metricAlias}
                      readOnly={!isWriteable}
                    />
                    <EuiSpacer />
                    <FieldsConfigurationPanel
                      containerFieldProps={indicesConfigurationProps.containerField}
                      hostFieldProps={indicesConfigurationProps.hostField}
                      isLoading={isLoading}
                      podFieldProps={indicesConfigurationProps.podField}
                      readOnly={!isWriteable}
                      tiebreakerFieldProps={indicesConfigurationProps.tiebreakerField}
                      timestampFieldProps={indicesConfigurationProps.timestampField}
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
                      addLogColumn={addLogColumn}
                      availableFields={availableFields}
                      isLoading={isLoading}
                      logColumnConfiguration={logColumnConfigurationProps}
                    />
                  </>
                ),
              },
            ]
          : [],
      [
        addLogColumn,
        availableFields,
        indicesConfigurationProps,
        intl.formatMessage,
        isLoading,
        isVisible,
        logColumnConfigurationProps,
        isWriteable,
      ]
    );
    const activeTab = useMemo(() => tabs.filter(tab => tab.id === activeTabId)[0] || tabs[0], [
      activeTabId,
      tabs,
    ]);
    const activateTab = useCallback(
      (tab: EuiTabbedContentTab) => {
        const tabId = tab.id;
        if (isValidTabId(tabId)) {
          setActiveTab(tabId);
        }
      },
      [setActiveTab, isValidTabId]
    );

    if (!isVisible || !source || !source.configuration) {
      return null;
    }

    return (
      <EuiFlyout
        aria-labelledby="sourceConfigurationTitle"
        data-test-subj="sourceConfigurationFlyout"
        hideCloseButton
        onClose={noop}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2 id="sourceConfigurationTitle">
              {isWriteable ? (
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
          <EuiTabbedContent onTabClick={activateTab} selectedTab={activeTab} tabs={tabs} />
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
            {isWriteable && (
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
