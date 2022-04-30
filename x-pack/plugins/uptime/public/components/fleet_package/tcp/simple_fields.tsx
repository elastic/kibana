/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { ConfigKey, Validation } from '../types';
import { useTCPSimpleFieldsContext } from '../contexts';
import { ScheduleField } from '../schedule_field';
import { SimpleFieldsWrapper } from '../common/simple_fields_wrapper';

interface Props {
  validate: Validation;
}

export const TCPSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useTCPSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };

  return (
    <SimpleFieldsWrapper fields={fields} validate={validate} onInputChange={handleInputChange}>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts"
            defaultMessage="Host:Port"
          />
        }
        isInvalid={!!validate[ConfigKey.HOSTS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts.error"
            defaultMessage="Host and port are required"
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
          data-test-subj="syntheticsTCPHostField"
        />
      </EuiFormRow>

      <EuiFormRow
        id="syntheticsFleetScheduleField--number syntheticsFleetScheduleField--unit"
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval"
            defaultMessage="Monitor interval"
          />
        }
        isInvalid={!!validate[ConfigKey.SCHEDULE]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval.error"
            defaultMessage="Monitor interval is required"
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
          number={fields[ConfigKey.SCHEDULE].number}
          unit={fields[ConfigKey.SCHEDULE].unit}
        />
      </EuiFormRow>
    </SimpleFieldsWrapper>
  );
});
