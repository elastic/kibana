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
import { useHTTPSimpleFieldsContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { CommonFields } from '../common/common_fields';

interface Props {
  validate: Validation;
}

export const HTTPSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useHTTPSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL"
            defaultMessage="URL"
          />
        }
        isInvalid={!!validate[ConfigKeys.URLS]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL.error"
            defaultMessage="URL is required"
          />
        }
      >
        <EuiFieldText
          value={fields[ConfigKeys.URLS]}
          onChange={(event) =>
            handleInputChange({ value: event.target.value, configKey: ConfigKeys.URLS })
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
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects"
            defaultMessage="Max redirects"
          />
        }
        isInvalid={!!validate[ConfigKeys.MAX_REDIRECTS]?.(fields)}
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
          value={fields[ConfigKeys.MAX_REDIRECTS]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKeys.MAX_REDIRECTS,
            })
          }
        />
      </EuiFormRow>
      <CommonFields fields={fields} onChange={handleInputChange} validate={validate} />
    </>
  );
});
