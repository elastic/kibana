/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiCheckbox,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';

import { useTCPAdvancedFieldsContext } from './contexts';

import { ConfigKeys } from './types';

import { OptionalLabel } from './optional_label';

export const TCPAdvancedFields = () => {
  const { fields, setFields } = useTCPAdvancedFieldsContext();

  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  return (
    <EuiAccordion id="uptimeFleetTCPAdvancedOptions" buttonContent="Advanced TCP options">
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.title"
              defaultMessage="Request configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.description"
            defaultMessage="Configure the payload sent to the remote host."
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.proxyURL.label"
              defaultMessage="Proxy URL"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.proxyUrl.tcp.helpText"
              defaultMessage="The URL of the SOCKS5 proxy to use when connecting to the server. The value must be a URL with a scheme of socks5://."
            />
          }
        >
          <EuiFieldText
            value={fields[ConfigKeys.PROXY_URL]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.PROXY_URL,
              })
            }
          />
        </EuiFormRow>
        {!!fields[ConfigKeys.PROXY_URL] && (
          <EuiFormRow>
            <EuiCheckbox
              id={'uptimeFleetUseLocalResolverCheckbox'}
              checked={fields[ConfigKeys.PROXY_USE_LOCAL_RESOLVER]}
              label={
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.resolveHostnamesLocally"
                  defaultMessage="Resolve hostnames locally"
                />
              }
              onChange={(event) =>
                handleInputChange({
                  value: event.target.checked,
                  configKey: ConfigKeys.PROXY_USE_LOCAL_RESOLVER,
                })
              }
            />
          </EuiFormRow>
        )}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.requestPayload.label"
              defaultMessage="Request payload"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.requestPayload.helpText"
              defaultMessage="A payload string to send to the remote host."
            />
          }
        >
          <EuiFieldText
            value={fields[ConfigKeys.REQUEST_SEND_CHECK]}
            onChange={useCallback(
              (event) =>
                handleInputChange({
                  value: event.target.value,
                  configKey: ConfigKeys.REQUEST_SEND_CHECK,
                }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvancedOptions.responseConfiguration.title"
              defaultMessage="Response checks"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvancedOptions.responseConfiguration.description"
            defaultMessage="Configure the expected response from the remote host."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.responseConfiguration.responseContains.label"
              defaultMessage="Check response contains"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.responseConfiguration.responseContains.helpText"
              defaultMessage="The expected remote host response."
            />
          }
        >
          <EuiFieldText
            value={fields[ConfigKeys.RESPONSE_RECEIVE_CHECK]}
            onChange={useCallback(
              (event) =>
                handleInputChange({
                  value: event.target.value,
                  configKey: ConfigKeys.RESPONSE_RECEIVE_CHECK,
                }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
};
