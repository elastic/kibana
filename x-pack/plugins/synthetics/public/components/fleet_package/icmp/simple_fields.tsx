/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { ConfigKey, Validation } from '../types';
import { useICMPSimpleFieldsContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { SimpleFieldsWrapper } from '../common/simple_fields_wrapper';

interface Props {
  validate: Validation;
  onFieldBlur: (field: ConfigKey) => void; // To propagate blurred state up to parents
}

export const ICMPSimpleFields = memo<Props>(({ validate, onFieldBlur }) => {
  const { fields, setFields } = useICMPSimpleFieldsContext();
  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  return (
    <SimpleFieldsWrapper
      fields={fields}
      validate={validate}
      onInputChange={handleInputChange}
      onFieldBlur={onFieldBlur}
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts"
            defaultMessage="Host"
          />
        }
        isInvalid={!!validate[ConfigKey.HOSTS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts.error"
            defaultMessage="Host is required"
          />
        }
      >
        <EuiFieldText
          value={fields[ConfigKey.HOSTS]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.HOSTS,
            })
          }
          onBlur={() => onFieldBlur(ConfigKey.HOSTS)}
          data-test-subj="syntheticsICMPHostField"
        />
      </EuiFormRow>
      <EuiFormRow
        id="syntheticsFleetScheduleField--number syntheticsFleetScheduleField--unit"
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval"
            defaultMessage="Frequency"
          />
        }
        isInvalid={!!validate[ConfigKey.SCHEDULE]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval.error"
            defaultMessage="Monitor frequency is required"
          />
        }
      >
        <ScheduleField
          onChange={(schedule) =>
            handleInputChange({
              value: schedule,
              configKey: ConfigKey.SCHEDULE,
            })
          }
          onBlur={() => onFieldBlur(ConfigKey.SCHEDULE)}
          number={fields[ConfigKey.SCHEDULE].number}
          unit={fields[ConfigKey.SCHEDULE].unit}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.label"
            defaultMessage="Wait in seconds"
          />
        }
        isInvalid={!!validate[ConfigKey.WAIT]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.error"
            defaultMessage="Wait must be 0 or greater"
          />
        }
        labelAppend={<OptionalLabel />}
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.helpText"
            defaultMessage="The duration to wait before emitting another ICMP Echo Request if no response is received."
          />
        }
      >
        <EuiFieldNumber
          min={0}
          value={fields[ConfigKey.WAIT]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.WAIT,
            })
          }
          onBlur={() => onFieldBlur(ConfigKey.WAIT)}
          step={'any'}
        />
      </EuiFormRow>
    </SimpleFieldsWrapper>
  );
});
