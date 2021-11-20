/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiSelect,
  EuiFieldText,
  EuiCheckbox,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiSpacer,
} from '@elastic/eui';
import { ComboBox } from '../combo_box';

import { useBrowserAdvancedFieldsContext, useBrowserSimpleFieldsContext } from '../contexts';

import { ConfigKeys, ScreenshotOption } from '../types';

import { OptionalLabel } from '../optional_label';

export const BrowserAdvancedFields = () => {
  const { fields, setFields } = useBrowserAdvancedFieldsContext();
  const { fields: simpleFields } = useBrowserSimpleFieldsContext();

  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  return (
    <EuiAccordion
      id="syntheticsIntegrationBrowserAdvancedOptions"
      buttonContent="Advanced Browser options"
      data-test-subj="syntheticsBrowserAdvancedFieldsAccordion"
    >
      <EuiSpacer size="m" />
      {simpleFields[ConfigKeys.SOURCE_ZIP_URL] && (
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.filtering.title"
                defaultMessage="Selective tests"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.filtering.description"
              defaultMessage="Use these options to apply the selected monitor settings to a subset of the tests in your suite. Only the configured subset will be run by this monitor."
            />
          }
        >
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.journeyFiltersMatch.label"
                defaultMessage="Filter match"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.journeyFiltersMatch.helpText"
                defaultMessage="Run only journeys with a name that matches the provided glob with this monitor."
              />
            }
          >
            <EuiFieldText
              value={fields[ConfigKeys.JOURNEY_FILTERS_MATCH]}
              onChange={(event) =>
                handleInputChange({
                  value: event.target.value,
                  configKey: ConfigKeys.JOURNEY_FILTERS_MATCH,
                })
              }
              data-test-subj="syntheticsBrowserJourneyFiltersMatch"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.journeyFiltersTags.label"
                defaultMessage="Filter tags"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.journeyFiltersTags.helpText"
                defaultMessage="Run only journeys with the given tags with this monitor."
              />
            }
          >
            <ComboBox
              selectedOptions={fields[ConfigKeys.JOURNEY_FILTERS_TAGS]}
              onChange={(value) =>
                handleInputChange({ value, configKey: ConfigKeys.JOURNEY_FILTERS_TAGS })
              }
              data-test-subj="syntheticsBrowserJourneyFiltersTags"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      )}
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.title"
              defaultMessage="Synthetics agent options"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.description"
            defaultMessage="Provide fine-tuned configuration for the synthetics agent."
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          helpText={
            <>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.ignoreHttpsErrors.helpText"
                defaultMessage="Set this option to true to disable TLS/SSL validation in the synthetics browser. This is useful for testing sites that use self-signed certs."
              />
            </>
          }
          data-test-subj="syntheticsBrowserIgnoreHttpsErrors"
        >
          <EuiCheckbox
            id="syntheticsBrowserIgnoreHttpsErrorsCheckbox"
            checked={fields[ConfigKeys.IGNORE_HTTPS_ERRORS]}
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.ignoreHttpsErrors.label"
                defaultMessage="Ignore HTTPS errors"
              />
            }
            onChange={(event) =>
              handleInputChange({
                value: event.target.checked,
                configKey: ConfigKeys.IGNORE_HTTPS_ERRORS,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.screenshots.label"
              defaultMessage="Screenshot options"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.screenshots.helpText"
              defaultMessage="Set this option to manage the screenshots captured by the synthetics agent."
            />
          }
        >
          <EuiSelect
            options={requestMethodOptions}
            value={fields[ConfigKeys.SCREENSHOTS]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.SCREENSHOTS,
              })
            }
            data-test-subj="syntheticsBrowserScreenshots"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.syntheticsArgs.label"
              defaultMessage="Synthetics args"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.syntheticsArgs.helpText"
              defaultMessage="Extra arguments to pass to the synthetics agent package. Takes a list of strings. This is useful in rare scenarios, and should not ordinarily need to be set."
            />
          }
        >
          <ComboBox
            selectedOptions={fields[ConfigKeys.SYNTHETICS_ARGS]}
            onChange={(value) =>
              handleInputChange({ value, configKey: ConfigKeys.SYNTHETICS_ARGS })
            }
            data-test-subj="syntheticsBrowserSyntheticsArgs"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
};

const requestMethodOptions = Object.values(ScreenshotOption).map((option) => ({
  value: option,
  text: option.replace(/-/g, ' '),
}));
