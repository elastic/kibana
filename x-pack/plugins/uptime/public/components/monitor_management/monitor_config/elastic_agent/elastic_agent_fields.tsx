/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { DescribedFormGroupWithWrap } from '../../../fleet_package/common/described_form_group_with_wrap';
import { ConfigKey, DataStream } from '../../../fleet_package/types';
import {
  usePolicyConfigContext,
  useHTTPSimpleFieldsContext,
} from '../../../fleet_package/contexts';
import { validate } from '../../validation';
import { ScheduleField } from '../../../fleet_package/schedule_field';
import { OptionalLabel } from '../../../fleet_package/optional_label';
import { ComboBox } from '../../../fleet_package/combo_box';
import { MonitorNameAndLocation } from '../monitor_name_location';

interface Props {
  isFormSubmitted: boolean;
}

const MIN_COLUMN_WRAP_WIDTH = '360px';

export const ElasticAgentMonitorFields = ({ isFormSubmitted }: Props) => {
  const { isEditable } = usePolicyConfigContext();
  const { fields, setFields } = useHTTPSimpleFieldsContext();

  const [touchedFieldsHash, setTouchedFieldsHash] = useState<Record<string, boolean>>({});

  const fieldValidation = useMemo(() => {
    const validatorsHash = { ...validate[DataStream.HTTP] };
    if (!isFormSubmitted) {
      Object.keys(validatorsHash).map((key) => {
        if (!touchedFieldsHash[key]) {
          validatorsHash[key as ConfigKey] = undefined;
        }
      });
    }

    return validatorsHash;
  }, [isFormSubmitted, touchedFieldsHash]);

  const handleFieldBlur = (field: ConfigKey) => {
    setTouchedFieldsHash((hash) => ({ ...hash, [field]: true }));
  };

  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKey }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  return (
    <EuiForm component="form">
      <DescribedFormGroupWithWrap
        minColumnWidth={MIN_COLUMN_WRAP_WIDTH}
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSectionTitle"
              defaultMessage="Monitor settings"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSectionDescription"
            defaultMessage="Configure your monitor with the following options."
          />
        }
        data-test-subj="monitorSettingsSection"
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <MonitorNameAndLocation validate={fieldValidation} onFieldBlur={handleFieldBlur} />
            {!isEditable && (
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType"
                    defaultMessage="Monitor Type"
                  />
                }
              >
                <span>HTTP</span>
              </EuiFormRow>
            )}
            <EuiSpacer size="s" />
            <EuiFormRow
              id="syntheticsFleetScheduleField"
              label={
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval"
                  defaultMessage="Frequency"
                />
              }
              isInvalid={!!fieldValidation[ConfigKey.SCHEDULE]?.(fields)}
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
                onBlur={() => handleFieldBlur(ConfigKey.SCHEDULE)}
                number={fields[ConfigKey.SCHEDULE].number}
                unit={fields[ConfigKey.SCHEDULE].unit}
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
                selectedOptions={fields[ConfigKey.TAGS]}
                onChange={(value) => handleInputChange({ value, configKey: ConfigKey.TAGS })}
                onBlur={() => handleFieldBlur?.(ConfigKey.TAGS)}
                data-test-subj="syntheticsTags"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </DescribedFormGroupWithWrap>
    </EuiForm>
  );
};
