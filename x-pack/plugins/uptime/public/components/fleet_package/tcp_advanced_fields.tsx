/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, memo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiLink,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';

import { ConfigKeys, Config, ITCPAdvancedFields } from './types';

import { OptionalLabel } from './optional_label';
import { ComboBox } from './combo_box';

interface Props {
  defaultValues: ITCPAdvancedFields;
  onChange: (values: Partial<Config>) => void;
}

export const TCPAdvancedFields = memo<Props>(({ defaultValues, onChange }) => {
  const [fields, setFields] = useState<ITCPAdvancedFields>(defaultValues);

  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  useDebounce(
    () => {
      onChange(fields);
    },
    250,
    [fields]
  );

  return (
    <EuiAccordion id="uptimeFleetAdvancedOptions" buttonContent="Advanced options">
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
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.requestPayload.label"
              defaultMessage="Request payload"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tcpAdvacnedSettings.requestConfiguration.requestPayload.helpText"
              defaultMessage="An optional payload string to send to the remote host."
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
          <ComboBox
            selectedOptions={fields[ConfigKeys.RESPONSE_RECEIVE_CHECK]}
            onChange={useCallback(
              (value) =>
                handleInputChange({
                  value,
                  configKey: ConfigKeys.RESPONSE_RECEIVE_CHECK,
                }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
});
