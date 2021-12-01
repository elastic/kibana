/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow } from '@elastic/eui';
import { ConfigKeys, Validation } from '../types';
import { useBrowserSimpleFieldsContext } from '../contexts';
import { ScheduleField } from '../schedule_field';
import { SourceField } from './source_field';
import { CommonFields } from '../common/common_fields';

interface Props {
  validate: Validation;
}

export const BrowserSimpleFields = memo<Props>(({ validate }) => {
  const { fields, setFields, defaultValues } = useBrowserSimpleFieldsContext();
  const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
    setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
  };
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
        [ConfigKeys.SOURCE_ZIP_URL]: zipUrl,
        [ConfigKeys.SOURCE_ZIP_PROXY_URL]: proxyUrl,
        [ConfigKeys.SOURCE_ZIP_FOLDER]: folder,
        [ConfigKeys.SOURCE_ZIP_USERNAME]: username,
        [ConfigKeys.SOURCE_ZIP_PASSWORD]: password,
        [ConfigKeys.SOURCE_INLINE]: inlineScript,
        [ConfigKeys.PARAMS]: params,
        [ConfigKeys.METADATA]: {
          ...prevFields[ConfigKeys.METADATA],
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
              proxyUrl: defaultValues[ConfigKeys.SOURCE_ZIP_PROXY_URL],
              folder: defaultValues[ConfigKeys.SOURCE_ZIP_FOLDER],
              username: defaultValues[ConfigKeys.SOURCE_ZIP_USERNAME],
              password: defaultValues[ConfigKeys.SOURCE_ZIP_PASSWORD],
              inlineScript: defaultValues[ConfigKeys.SOURCE_INLINE],
              params: defaultValues[ConfigKeys.PARAMS],
              isGeneratedScript:
                defaultValues[ConfigKeys.METADATA].script_source?.is_generated_script,
              fileName: defaultValues[ConfigKeys.METADATA].script_source?.file_name,
            }),
            [defaultValues]
          )}
        />
      </EuiFormRow>
      <CommonFields fields={fields} onChange={handleInputChange} validate={validate} />
    </>
  );
});
