/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback } from 'react';
import { SimpleFieldsWrapper } from '../common/simple_fields_wrapper';
import { useHTTPSimpleFieldsContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { ConfigKey, Validation } from '../types';

interface Props {
  validate: Validation;
  onFieldBlur: (field: ConfigKey) => void; // To propagate blurred state up to parents
}

export const HTTPSimpleFields = memo<Props>(({ validate, onFieldBlur }) => {
  const { fields, setFields } = useHTTPSimpleFieldsContext();
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
          onBlur={() => onFieldBlur(ConfigKey.URLS)}
          data-test-subj="syntheticsUrlField"
        />
      </EuiFormRow>
      <EuiFormRow
        id="syntheticsFleetScheduleField"
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
          onBlur={() => onFieldBlur(ConfigKey.MAX_REDIRECTS)}
        />
      </EuiFormRow>
    </SimpleFieldsWrapper>
  );
});
