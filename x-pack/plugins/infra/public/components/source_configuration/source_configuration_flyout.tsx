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
import { WithSourceConfigurationFormState } from './source_configuration_form_state';

const noop = () => undefined;

export const SourceConfigurationFlyout: React.FunctionComponent = () => {
  const { isVisible, hide } = useContext(SourceConfigurationFlyoutState.Context);

  const {
    createSourceConfiguration,
    source,
    sourceExists,
    isLoading,
    updateSourceConfiguration,
  } = useContext(Source.Context);

  const configuration = source && source.configuration;

  if (!isVisible || !configuration) {
    return null;
  }

  return (
    <WithSourceConfigurationFormState
      initialFormState={{
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
        <EuiFlyout aria-labelledby="sourceConfigurationTitle" hideCloseButton onClose={noop}>
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
            <NameConfigurationPanel isLoading={isLoading} nameFieldProps={getNameFieldProps()} />
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
                  <EuiButtonEmpty iconType="cross" isDisabled={isLoading} onClick={() => hide()}>
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
                      (exists
                        ? updateSourceConfiguration(updates)
                        : createSourceConfiguration(getCurrentFormState())
                      ).then(() => resetForm())
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
  );
};
