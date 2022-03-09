/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow } from '@elastic/eui';
import { Validation } from '../types';
import { ConfigKey } from '../types';
import { useBrowserSimpleFieldsContext } from '../contexts';
import { ScheduleField } from '../schedule_field';
import { SourceField } from './source_field';
import { SimpleFieldsWrapper } from '../common/simple_fields_wrapper';

interface Props {
  validate: Validation;
  onFieldBlur: (field: ConfigKey) => void; // To propagate blurred state up to parents
}

export const BrowserSimpleFields = memo<Props>(({ validate, onFieldBlur }) => {
  const { fields, setFields, defaultValues } = useBrowserSimpleFieldsContext();
  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );
  const onChangeSourceField = useCallback(
    ({
      zipUrl,
      folder,
      username,
      password,
      inlineScript,
      params,
      proxyUrl,
      isGeneratedScript,
      fileName,
    }) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKey.SOURCE_ZIP_URL]: zipUrl,
        [ConfigKey.SOURCE_ZIP_PROXY_URL]: proxyUrl,
        [ConfigKey.SOURCE_ZIP_FOLDER]: folder,
        [ConfigKey.SOURCE_ZIP_USERNAME]: username,
        [ConfigKey.SOURCE_ZIP_PASSWORD]: password,
        [ConfigKey.SOURCE_INLINE]: inlineScript,
        [ConfigKey.PARAMS]: params,
        [ConfigKey.METADATA]: {
          ...prevFields[ConfigKey.METADATA],
          script_source: {
            is_generated_script: isGeneratedScript,
            file_name: fileName,
          },
        },
      }));
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
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.sourceType.label"
            defaultMessage="Source Type"
          />
        }
      >
        <SourceField
          onChange={onChangeSourceField}
          onFieldBlur={onFieldBlur}
          defaultConfig={useMemo(
            () => ({
              zipUrl: defaultValues[ConfigKey.SOURCE_ZIP_URL],
              proxyUrl: defaultValues[ConfigKey.SOURCE_ZIP_PROXY_URL],
              folder: defaultValues[ConfigKey.SOURCE_ZIP_FOLDER],
              username: defaultValues[ConfigKey.SOURCE_ZIP_USERNAME],
              password: defaultValues[ConfigKey.SOURCE_ZIP_PASSWORD],
              inlineScript: defaultValues[ConfigKey.SOURCE_INLINE],
              params: defaultValues[ConfigKey.PARAMS],
              isGeneratedScript:
                defaultValues[ConfigKey.METADATA].script_source?.is_generated_script,
              fileName: defaultValues[ConfigKey.METADATA].script_source?.file_name,
            }),
            [defaultValues]
          )}
        />
      </EuiFormRow>
    </SimpleFieldsWrapper>
  );
});
