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
import React from 'react';

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { WithSource } from '../../containers/with_source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { WithSourceConfigurationFlyoutState } from './source_configuration_flyout_state';
import { WithSourceConfigurationFormState } from './source_configuration_form_state';

const noop = () => undefined;

interface SourceConfigurationFlyoutProps {
  intl: InjectedIntl;
}

export const SourceConfigurationFlyout = injectI18n(({ intl }: SourceConfigurationFlyoutProps) => (
  <WithSourceConfigurationFlyoutState>
    {({ disable: close, value: isVisible }) =>
      isVisible ? (
        <WithSource>
          {({ create, configuration, exists, isLoading, update }) =>
            configuration ? (
              <WithSourceConfigurationFormState
                initialFormState={{
                  name: configuration.name,
                  description: configuration.description,
                  fields: {
                    container: configuration.fields.container,
                    host: configuration.fields.host,
                    pod: configuration.fields.pod,
                    tiebreaker: configuration.fields.tiebreaker,
                    timestamp: configuration.fields.timestamp,
                  },
                  logAlias: configuration.logAlias,
                  metricAlias: configuration.metricAlias,
                }}
              >
                {({
                  getCurrentFormState,
                  getNameFieldProps,
                  getLogAliasFieldProps,
                  getMetricAliasFieldProps,
                  getFieldFieldProps,
                  isFormValid,
                  resetForm,
                  updates,
                }) => (
                  <EuiFlyout
                    aria-labelledby="sourceConfigurationTitle"
                    hideCloseButton
                    onClose={noop}
                  >
                    <EuiFlyoutHeader>
                      <EuiTitle>
                        <h2 id="sourceConfigurationTitle">
                          <FormattedMessage
                            id="xpack.infra.sourceConfiguration.sourceConfigurationTitle"
                            defaultMessage="Configure source"
                          />
                        </h2>
                      </EuiTitle>
                    </EuiFlyoutHeader>
                    <EuiFlyoutBody>
                      <NameConfigurationPanel
                        isLoading={isLoading}
                        nameFieldProps={getNameFieldProps()}
                      />
                      <EuiSpacer />
                      <IndicesConfigurationPanel
                        isLoading={isLoading}
                        logAliasFieldProps={getLogAliasFieldProps()}
                        metricAliasFieldProps={getMetricAliasFieldProps()}
                      />
                      <EuiSpacer />
                      <FieldsConfigurationPanel
                        containerFieldProps={getFieldFieldProps('container')}
                        hostFieldProps={getFieldFieldProps('host')}
                        isLoading={isLoading}
                        podFieldProps={getFieldFieldProps('pod')}
                        tiebreakerFieldProps={getFieldFieldProps('tiebreaker')}
                        timestampFieldProps={getFieldFieldProps('timestamp')}
                      />
                    </EuiFlyoutBody>
                    <EuiFlyoutFooter>
                      <EuiFlexGroup>
                        <EuiFlexItem grow={false}>
                          {updates.length === 0 ? (
                            <EuiButtonEmpty
                              iconType="cross"
                              isDisabled={isLoading}
                              onClick={() => close()}
                            >
                              <FormattedMessage
                                id="xpack.infra.sourceConfiguration.closeButtonLabel"
                                defaultMessage="Close"
                              />
                            </EuiButtonEmpty>
                          ) : (
                            <EuiButtonEmpty
                              color="danger"
                              iconType="cross"
                              isDisabled={isLoading}
                              onClick={() => {
                                resetForm();
                                close();
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
                        <EuiFlexItem grow={false}>
                          {isLoading ? (
                            <EuiButton color="primary" isLoading fill>
                              Loading
                            </EuiButton>
                          ) : (
                            <EuiButton
                              color="primary"
                              isDisabled={updates.length === 0 || !isFormValid()}
                              fill
                              onClick={() =>
                                (exists ? update(updates) : create(getCurrentFormState())).then(
                                  () => resetForm()
                                )
                              }
                            >
                              <FormattedMessage
                                id="xpack.infra.sourceConfiguration.updateSourceConfigurationButtonLabel"
                                defaultMessage="Update Source"
                              />
                            </EuiButton>
                          )}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlyoutFooter>
                  </EuiFlyout>
                )}
              </WithSourceConfigurationFormState>
            ) : null
          }
        </WithSource>
      ) : null
    }
  </WithSourceConfigurationFlyoutState>
));
