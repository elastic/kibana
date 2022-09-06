/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiAccordion, EuiCallOut, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { ConfigKey } from '../../../../../common/runtime_types';
import {
  useBrowserSimpleFieldsContext,
  useBrowserAdvancedFieldsContext,
} from '../../fleet_package/contexts';
import { Enabled } from '../../fleet_package/common/enabled';
import { ScheduleField } from '../../fleet_package/schedule_field';
import { ComboBox } from '../../fleet_package/combo_box';
import { MonitorNameAndLocation } from './monitor_name_location';
import { ThrottlingFields } from '../../fleet_package/browser/throttling_fields';
import { OptionalLabel } from '../../fleet_package/optional_label';
import { DescribedFormGroupWithWrap } from '../../fleet_package/common/described_form_group_with_wrap';

const noop = () => {};

export const ProjectBrowserReadonlyFields = ({ minColumnWidth }: { minColumnWidth: string }) => {
  const { fields } = useBrowserSimpleFieldsContext();
  const { fields: advancedFields } = useBrowserAdvancedFieldsContext();

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
      </DescribedFormGroupWithWrap>
      <EuiSpacer />
      <EuiAccordion
        id="syntheticsIntegrationBrowserAdvancedOptions"
        buttonContent="Advanced Browser options"
        data-test-subj="syntheticsBrowserAdvancedFieldsAccordion"
      >
        <EuiSpacer size="m" />
        <DescribedFormGroupWithWrap
          title={
            <h4>
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.title"
                defaultMessage="Synthetics agent options"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.synthetics.browser.project.browserAdvancedSettings.description"
              defaultMessage="Provide fine-tuned configuration for the synthetics agent."
            />
          }
          minColumnWidth={minColumnWidth}
        >
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.screenshots.label"
                defaultMessage="Screenshot options"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.screenshots.helpText"
                defaultMessage="Set this option to manage the screenshots captured by the synthetics agent."
              />
            }
          >
            <EuiFieldText
              value={advancedFields[ConfigKey.SCREENSHOTS]}
              onChange={noop}
              data-test-subj="syntheticsBrowserScreenshots"
              readOnly={true}
            />
          </EuiFormRow>
        </DescribedFormGroupWithWrap>

        <ThrottlingFields minColumnWidth={minColumnWidth} readOnly={true} />
      </EuiAccordion>
    </>
  );
};
