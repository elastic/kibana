/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { ConfigKeys, Validation } from '../types';
import { useICMPSimpleFieldsContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { CommonFields } from '../common/common_fields';

interface Props {
  validate: Validation;
}

export const ICMPSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useICMPSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts"
            defaultMessage="Host"
          />
        }
        isInvalid={!!validate[ConfigKeys.HOSTS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts.error"
            defaultMessage="Host is required"
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
          data-test-subj="syntheticsICMPHostField"
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
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.label"
            defaultMessage="Wait in seconds"
          />
        }
        isInvalid={!!validate[ConfigKeys.WAIT]?.(fields)}
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
          value={fields[ConfigKeys.WAIT]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKeys.WAIT,
            })
          }
          step={'any'}
        />
      </EuiFormRow>
      <CommonFields fields={fields} onChange={handleInputChange} validate={validate} />
    </>
  );
});
