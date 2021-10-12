/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { ConfigKeys, Validation } from '../types';
import { useTCPSimpleFieldsContext } from '../contexts';
import { ScheduleField } from '../schedule_field';
import { CommonFields } from '../common/common_fields';

interface Props {
  validate: Validation;
}

export const TCPSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useTCPSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts"
            defaultMessage="Host:Port"
          />
        }
        isInvalid={!!validate[ConfigKeys.HOSTS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts.error"
            defaultMessage="Host and port are required"
          />
        }
      >
        <EuiFieldText
          value={fields[ConfigKeys.HOSTS]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKeys.HOSTS,
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
        isInvalid={!!validate[ConfigKeys.SCHEDULE]?.(fields)}
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
              configKey: ConfigKeys.SCHEDULE,
            })
          }
          number={fields[ConfigKeys.SCHEDULE].number}
          unit={fields[ConfigKeys.SCHEDULE].unit}
        />
      </EuiFormRow>
      <CommonFields fields={fields} onChange={handleInputChange} validate={validate} />
    </>
  );
});
