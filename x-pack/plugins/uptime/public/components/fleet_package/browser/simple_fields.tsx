/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { ConfigKeys, Validation } from '../types';
import { useBrowserSimpleFieldsContext } from '../contexts';
import { ComboBox } from '../combo_box';
import { OptionalLabel } from '../optional_label';
import { ScheduleField } from '../schedule_field';
import { SourceField } from './source_field';

interface Props {
  validate: Validation;
}

export const BrowserSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields, defaultValues } = useBrowserSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };
  const onChangeSourceField = useCallback(
    ({ zipUrl, folder, username, password, inlineScript, params }) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.SOURCE_ZIP_URL]: zipUrl,
        [ConfigKeys.SOURCE_ZIP_FOLDER]: folder,
        [ConfigKeys.SOURCE_ZIP_USERNAME]: username,
        [ConfigKeys.SOURCE_ZIP_PASSWORD]: password,
        [ConfigKeys.SOURCE_INLINE]: inlineScript,
        [ConfigKeys.PARAMS]: params,
      }));
    },
    [setFields]
  );

  return (
    <>
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
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.sourceType.label"
            defaultMessage="Source Type"
          />
        }
      >
        <SourceField
          onChange={onChangeSourceField}
          defaultConfig={useMemo(
            () => ({
              zipUrl: defaultValues[ConfigKeys.SOURCE_ZIP_URL],
              folder: defaultValues[ConfigKeys.SOURCE_ZIP_FOLDER],
              username: defaultValues[ConfigKeys.SOURCE_ZIP_USERNAME],
              password: defaultValues[ConfigKeys.SOURCE_ZIP_PASSWORD],
              inlineScript: defaultValues[ConfigKeys.SOURCE_INLINE],
              params: defaultValues[ConfigKeys.PARAMS],
            }),
            [defaultValues]
          )}
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
            defaultMessage="A list of tags that will be sent with the monitor event. Press enter to add a new tag. Displayed in Uptime and enables searching by tag."
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
