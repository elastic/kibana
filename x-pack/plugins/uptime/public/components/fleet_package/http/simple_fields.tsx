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
import { ComboBox } from '../combo_box';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';

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
        isInvalid={!!validate[ConfigKeys.URLS]?.(fields[ConfigKeys.URLS])}
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
        id="syntheticsFleetScheduleField--number syntheticsFleetScheduleField--unit"
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval"
            defaultMessage="Monitor interval"
          />
        }
        isInvalid={!!validate[ConfigKeys.SCHEDULE]?.(fields[ConfigKeys.SCHEDULE])}
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
            handleInputChange({
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
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects"
            defaultMessage="Max redirects"
          />
        }
        isInvalid={!!validate[ConfigKeys.MAX_REDIRECTS]?.(fields[ConfigKeys.MAX_REDIRECTS])}
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
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.label"
            defaultMessage="Timeout in seconds"
          />
        }
        isInvalid={
          !!validate[ConfigKeys.TIMEOUT]?.(
            fields[ConfigKeys.TIMEOUT],
            fields[ConfigKeys.SCHEDULE].number,
            fields[ConfigKeys.SCHEDULE].unit
          )
        }
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.error"
            defaultMessage="Timeout must be 0 or greater and less than schedule interval"
          />
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
            handleInputChange({
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
            defaultMessage="A list of tags that will be sent with the monitor event. Press enter to add a new tab. Displayed in Uptime and enables searching by tag."
          />
        }
      >
        <ComboBox
          selectedOptions={fields[ConfigKeys.TAGS]}
          onChange={(value) => handleInputChange({ value, configKey: ConfigKeys.TAGS })}
          data-test-subj="syntheticsTags"
        />
      </EuiFormRow>
    </>
  );
});
