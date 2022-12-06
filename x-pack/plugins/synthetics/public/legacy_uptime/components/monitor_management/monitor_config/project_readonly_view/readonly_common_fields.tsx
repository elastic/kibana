/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  BrowserSimpleFields,
  HTTPSimpleFields,
  ICMPSimpleFields,
  TCPSimpleFields,
} from '../../../../../../common/runtime_types';
import { DescribedFormGroupWithWrap } from '../../../fleet_package/common/described_form_group_with_wrap';
import { MonitorNameAndLocation } from '../monitor_name_location';
import { Enabled } from '../../../fleet_package/common/enabled';
import { ScheduleField } from '../../../fleet_package/schedule_field';
import { ConfigKey } from '../../../../../../common/constants/monitor_management';
import { OptionalLabel } from '../../../fleet_package/optional_label';
import { ComboBox } from '../../../fleet_package/combo_box';

const noop = () => {};

export const ProjectReadonlyCommonFields = ({
  minColumnWidth,
  extraFields,
  fields,
}: {
  minColumnWidth: string;
  extraFields?: JSX.Element;
  fields: TCPSimpleFields | HTTPSimpleFields | ICMPSimpleFields | BrowserSimpleFields;
}) => {
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.browser.project.readOnly.callout.title"
            defaultMessage="Read only"
          />
        }
        iconType="document"
      >
        <p>
          <FormattedMessage
            id="xpack.synthetics.browser.project.readOnly.callout.content"
            defaultMessage="This monitor was added from an external project. Configuration is read only."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer />
      <DescribedFormGroupWithWrap
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.browser.project.monitorIntegrationSettingsSectionTitle"
              defaultMessage="Monitor settings"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.browser.project.monitorIntegrationSettingsSectionDescription"
            defaultMessage="Configure your monitor with the following options."
          />
        }
        data-test-subj="monitorSettingsSection"
        minColumnWidth={minColumnWidth}
      >
        <MonitorNameAndLocation readOnly={true} />
        <Enabled fields={fields} onChange={noop} onBlur={noop} readOnly={true} />
        <EuiFormRow
          id="syntheticsFleetScheduleField--number syntheticsFleetScheduleField--unit"
          label={
            <FormattedMessage
              id="xpack.synthetics.browser.project.monitorIntegrationSettingsSection.monitorInterval"
              defaultMessage="Frequency"
            />
          }
          error={
            <FormattedMessage
              id="xpack.synthetics.browser.project.monitorIntegrationSettingsSection.monitorInterval.error"
              defaultMessage="Monitor frequency is required"
            />
          }
        >
          <ScheduleField
            onBlur={noop}
            onChange={noop}
            number={fields[ConfigKey.SCHEDULE].number}
            unit={fields[ConfigKey.SCHEDULE].unit}
            readOnly={true}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.synthetics.browser.project.monitorIntegrationSettingsSection.tags.label"
              defaultMessage="Tags"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.synthetics.browser.project.monitorIntegrationSettingsSection.tags.helpText"
              defaultMessage="A list of tags that will be sent with the monitor event. Press enter to add a new tag. Displayed in Uptime and enables searching by tag."
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <ComboBox
            selectedOptions={fields[ConfigKey.TAGS]}
            onChange={noop}
            onBlur={noop}
            data-test-subj="syntheticsTags"
            readOnly={true}
          />
        </EuiFormRow>
        {extraFields}
      </DescribedFormGroupWithWrap>
      <EuiSpacer />
    </>
  );
};
