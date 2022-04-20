/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import { ComboBox } from '../combo_box';
import { usePolicyConfigContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { CommonFields as CommonFieldsType, ConfigKey, DataStream, Validation } from '../types';

interface Props {
  validate: Validation;
  fields: CommonFieldsType;
  onChange: ({
    value,
    configKey,
  }: {
    value: string | string[] | null;
    configKey: ConfigKey;
  }) => void;
  onFieldBlur?: (field: ConfigKey) => void;
}

export function CommonFields({ fields, onChange, onFieldBlur, validate }: Props) {
  const { monitorType } = usePolicyConfigContext();

  const isBrowser = monitorType === DataStream.BROWSER;

  useEffect(() => {
    if (monitorType === DataStream.BROWSER) {
      onChange({
        value: null,
        configKey: ConfigKey.TIMEOUT,
      });
    }
  }, [onChange, monitorType]);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.APMServiceName.label"
            defaultMessage="APM service name"
          />
        }
        labelAppend={<OptionalLabel />}
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.APMServiceName.helpText"
            defaultMessage="APM service name for this monitor. Corresponds to the service.name ECS field. Set this when monitoring an app that is also using APM to enable integrations between Uptime and APM data in Kibana."
          />
        }
      >
        <EuiFieldText
          value={fields[ConfigKey.APM_SERVICE_NAME]}
          onChange={(event) =>
            onChange({
              value: event.target.value,
              configKey: ConfigKey.APM_SERVICE_NAME,
            })
          }
          onBlur={() => onFieldBlur?.(ConfigKey.APM_SERVICE_NAME)}
          data-test-subj="syntheticsAPMServiceName"
        />
      </EuiFormRow>
      {!isBrowser && (
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.label"
              defaultMessage="Timeout in seconds"
            />
          }
          isInvalid={!!validate[ConfigKey.TIMEOUT]?.(fields)}
          error={
            parseInt(fields[ConfigKey.TIMEOUT] || '', 10) < 0 ? (
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.moreThanZeroError"
                defaultMessage="Timeout must be greater than or equal to 0"
              />
            ) : (
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.lessThanIntervalError"
                defaultMessage="Timeout must be less than the monitor frequency"
              />
            )
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.helpText"
              defaultMessage="The total time allowed for testing the connection and exchanging data."
            />
          }
        >
          <EuiFieldNumber
            min={0}
            value={fields[ConfigKey.TIMEOUT] || ''}
            onChange={(event) =>
              onChange({
                value: event.target.value,
                configKey: ConfigKey.TIMEOUT,
              })
            }
            onBlur={() => onFieldBlur?.(ConfigKey.TIMEOUT)}
            step={'any'}
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tags.label"
            defaultMessage="Tags"
          />
        }
        labelAppend={<OptionalLabel />}
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tags.helpText"
            defaultMessage="A list of tags that will be sent with the monitor event. Press enter to add a new tag. Displayed in Uptime and enables searching by tag."
          />
        }
      >
        <ComboBox
          selectedOptions={fields[ConfigKey.TAGS]}
          onChange={(value) => onChange({ value, configKey: ConfigKey.TAGS })}
          onBlur={() => onFieldBlur?.(ConfigKey.TAGS)}
          data-test-subj="syntheticsTags"
        />
      </EuiFormRow>
    </>
  );
}
