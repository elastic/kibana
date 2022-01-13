/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { ConfigKey, Validation } from '../types';
import { useHTTPSimpleFieldsContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { SimpleFieldsWrapper } from '../common/simple_fields_wrapper';

interface Props {
  validate: Validation;
}

export const HTTPSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useHTTPSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };

  return (
    <SimpleFieldsWrapper fields={fields} validate={validate} onInputChange={handleInputChange}>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL"
            defaultMessage="URL"
          />
        }
        isInvalid={!!validate[ConfigKey.URLS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL.error"
            defaultMessage="URL is required"
          />
        }
      >
        <EuiFieldText
          value={fields[ConfigKey.URLS]}
          onChange={(event) =>
            handleInputChange({ value: event.target.value, configKey: ConfigKey.URLS })
          }
          data-test-subj="syntheticsUrlField"
        />
      </EuiFormRow>
      <EuiFormRow
        id="syntheticsFleetScheduleField"
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
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects"
            defaultMessage="Max redirects"
          />
        }
        isInvalid={!!validate[ConfigKey.MAX_REDIRECTS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects.error"
            defaultMessage="Max redirects must be 0 or greater"
          />
        }
        labelAppend={<OptionalLabel />}
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects.helpText"
            defaultMessage="The total number of redirections to follow."
          />
        }
      >
        <EuiFieldNumber
          min={0}
          value={fields[ConfigKey.MAX_REDIRECTS]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.MAX_REDIRECTS,
            })
          }
        />
      </EuiFormRow>
    </SimpleFieldsWrapper>
  );
});
