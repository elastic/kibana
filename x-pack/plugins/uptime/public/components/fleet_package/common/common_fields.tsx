/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { ConfigKeys, Validation, ICommonFields } from '../types';
import { ComboBox } from '../combo_box';
import { OptionalLabel } from '../optional_label';

interface Props {
  validate: Validation;
  fields: ICommonFields;
  onChange: ({ value, configKey }: { value: string | string[]; configKey: ConfigKeys }) => void;
}

export function CommonFields({ fields, onChange, validate }: Props) {
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
          value={fields[ConfigKeys.APM_SERVICE_NAME]}
          onChange={(event) =>
            onChange({
              value: event.target.value,
              configKey: ConfigKeys.APM_SERVICE_NAME,
            })
          }
          data-test-subj="syntheticsAPMServiceName"
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.label"
            defaultMessage="Timeout in seconds"
          />
        }
        isInvalid={!!validate[ConfigKeys.TIMEOUT]?.(fields)}
        error={
          parseInt(fields[ConfigKeys.TIMEOUT], 10) < 0 ? (
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.moreThanZeroError"
              defaultMessage="Timeout must be greater than or equal to 0"
            />
          ) : (
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.lessThanIntervalError"
              defaultMessage="Timeout must be less than the monitor interval"
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
          value={fields[ConfigKeys.TIMEOUT]}
          onChange={(event) =>
            onChange({
              value: event.target.value,
              configKey: ConfigKeys.TIMEOUT,
            })
          }
          step={'any'}
        />
      </EuiFormRow>
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
          selectedOptions={fields[ConfigKeys.TAGS]}
          onChange={(value) => onChange({ value, configKey: ConfigKeys.TAGS })}
          data-test-subj="syntheticsTags"
        />
      </EuiFormRow>
    </>
  );
}
