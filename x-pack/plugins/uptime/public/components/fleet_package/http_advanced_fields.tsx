/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, memo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiLink,
  EuiCheckbox,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';

import {
  ConfigKeys,
  HTTPMethod,
  ResponseBodyIndexPolicy,
  ICustomFields,
  IHTTPAdvancedFields,
} from './types';

import { OptionalLabel } from './optional_label';
import { HeaderField } from './header_field';
import { RequestBodyField } from './request_body_field';
import { ComboBox, Props as ComboBoxProps } from './combo_box';

interface Props {
  defaultValues: IHTTPAdvancedFields;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
}

export const HTTPAdvancedFields = memo<Props>(({ defaultValues, setFields }) => {
  const [advancedHTTPFields, setAdvancedHTTPFields] = useState<IHTTPAdvancedFields>(defaultValues);

  const handleInputChange = useCallback(
    ({
      event,
      configKey,
    }: {
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
      configKey: ConfigKeys;
    }) => {
      const value = event.target.value;
      setAdvancedHTTPFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setAdvancedHTTPFields]
  );

  useDebounce(
    () => {
      setFields((prevFields) => ({
        ...prevFields,
        ...advancedHTTPFields,
      }));
    },
    250,
    [advancedHTTPFields]
  );

  const handleCheckboxChange = useCallback(
    ({
      event,
      configKey,
    }: {
      event: React.ChangeEvent<HTMLInputElement>;
      configKey: ConfigKeys;
    }) => {
      const checked = event.target.checked;
      setAdvancedHTTPFields((prevFields) => ({ ...prevFields, [configKey]: checked }));
    },
    [setAdvancedHTTPFields]
  );
  return (
    <EuiAccordion id="uptimeFleetAdvancedOptions" buttonContent="Advanced options">
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationRequestSettingsSectionTitle"
              defaultMessage="Request configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationRequestSettingsSectionDescription"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow label="Request method">
          <EuiSelect
            options={requestMethodOptions}
            value={advancedHTTPFields[ConfigKeys.REQUEST_METHOD_CHECK]}
            onChange={useCallback(
              (event) => handleInputChange({ event, configKey: ConfigKeys.REQUEST_METHOD_CHECK }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label="Request headers"
        configKey={ConfigKeys.REQUEST_HEADERS_CHECK}
        contentMode={advancedHTTPFields[ConfigKeys.REQUEST_BODY_CHECK].type}
        setFields={setAdvancedHTTPFields}
      />
      <EuiFormRow label="Request body" fullWidth>
        <RequestBodyField
          value={advancedHTTPFields[ConfigKeys.REQUEST_BODY_CHECK].value}
          type={advancedHTTPFields[ConfigKeys.REQUEST_BODY_CHECK].type}
          setFields={setAdvancedHTTPFields}
        />
      </EuiFormRow>
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationResponseSettingsSectionTitle"
              defaultMessage="Response configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationResponseSettingsSectionDescription"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow label="Index response body">
          <EuiSelect
            options={responseBodyIndexPolicy}
            value={advancedHTTPFields[ConfigKeys.RESPONSE_BODY_INDEX]}
            onChange={useCallback(
              (event) => handleInputChange({ event, configKey: ConfigKeys.RESPONSE_BODY_INDEX }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiCheckbox
            id={'uptimeFleetIndexResponseHeaders'}
            checked={advancedHTTPFields[ConfigKeys.RESPONSE_HEADERS_INDEX]}
            label="Index response headers"
            onChange={useCallback(
              (event) =>
                handleCheckboxChange({
                  event,
                  configKey: ConfigKeys.RESPONSE_HEADERS_INDEX,
                }),
              [handleCheckboxChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationResponseChecksSectionTitle"
              defaultMessage="Response checks"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationResponseChecksSectionDescription"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFormRow label="Check response status equals" labelAppend={<OptionalLabel />}>
          <ComboBox
            configKey={ConfigKeys.RESPONSE_STATUS_CHECK}
            selectedOptions={advancedHTTPFields[ConfigKeys.RESPONSE_STATUS_CHECK]}
            setFields={setAdvancedHTTPFields as ComboBoxProps['setFields']}
          />
        </EuiFormRow>
        <EuiFormRow label="Check response contains" labelAppend={<OptionalLabel />}>
          <ComboBox
            configKey={ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE}
            selectedOptions={advancedHTTPFields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]}
            setFields={setAdvancedHTTPFields as ComboBoxProps['setFields']}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <>
              Check response does not contain{' '}
              <EuiIconTip
                content="Source maps allow browser dev tools to map minified code to the original source code"
                position="right"
              />
            </>
          }
          labelAppend={<OptionalLabel />}
          helpText="Sample help text"
        >
          <ComboBox
            configKey={ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE}
            selectedOptions={advancedHTTPFields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]}
            setFields={setAdvancedHTTPFields as ComboBoxProps['setFields']}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label="Check response headers"
        configKey={ConfigKeys.RESPONSE_HEADERS_CHECK}
        setFields={setAdvancedHTTPFields}
      />
    </EuiAccordion>
  );
});

const requestMethodOptions = [
  { value: HTTPMethod.GET, text: 'GET' },
  { value: HTTPMethod.POST, text: 'POST' },
  { value: HTTPMethod.PUT, text: 'PUT' },
  { value: HTTPMethod.DELETE, text: 'DELETE' },
  { value: HTTPMethod.HEAD, text: 'HEAD' },
  { value: HTTPMethod.CONNECT, text: 'CONNECT' },
  { value: HTTPMethod.OPTIONS, text: 'OPTIONS' },
  { value: HTTPMethod.TRACE, text: 'TRACE' },
  { value: HTTPMethod.PATCH, text: 'PATCH' },
];

const responseBodyIndexPolicy = [
  { value: ResponseBodyIndexPolicy.ALWAYS, text: 'Always' },
  { value: ResponseBodyIndexPolicy.NEVER, text: 'Never' },
  { value: ResponseBodyIndexPolicy.ON_ERROR, text: 'On error' },
];
