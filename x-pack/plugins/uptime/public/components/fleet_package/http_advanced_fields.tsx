/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiLink,
  EuiCheckbox,
  EuiSpacer,
  EuiPanel,
  EuiIconTip,
} from '@elastic/eui';

import { ConfigKeys, HTTPMethod, ResponseBodyIndexPolicy, ICustomFields } from './types';

import { OptionalLabel } from './optional_label';
import { HeaderField } from './header_field';
import { RequestBody } from './request_body';
import { ComboBox } from './combo_box';

interface Props {
  fields: ICustomFields;
  onCheckboxChange: ({
    event,
    configKey,
  }: {
    event: React.ChangeEvent<HTMLInputElement>;
    configKey: ConfigKeys;
  }) => void;
  onInputChange: ({
    event,
    configKey,
  }: {
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
    configKey: ConfigKeys;
  }) => void;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
}

export const HTTPAdvancedFields = ({
  fields,
  onCheckboxChange,
  onInputChange,
  setFields,
}: Props) => {
  return (
    <EuiAccordion id="uptimeFleetAdvancedOptions" buttonContent="Advanced options">
      <EuiSpacer size="m" />
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
        <EuiFormRow label="Index response body">
          <EuiSelect
            options={responseBodyIndexPolicy}
            value={fields[ConfigKeys.RESPONSE_BODY_INDEX]}
            onChange={(event) =>
              onInputChange({ event, configKey: ConfigKeys.RESPONSE_BODY_INDEX })
            }
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiCheckbox
            id={'uptimeFleetIndexResponseHeaders'}
            checked={fields[ConfigKeys.RESPONSE_HEADERS_INDEX]}
            label="Index response headers"
            onChange={(event) =>
              onCheckboxChange({
                event,
                configKey: ConfigKeys.RESPONSE_HEADERS_INDEX,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow label="Request method">
          <EuiSelect
            options={requestMethodOptions}
            value={fields[ConfigKeys.REQUEST_METHOD_CHECK]}
            onChange={(event) =>
              onInputChange({ event, configKey: ConfigKeys.REQUEST_METHOD_CHECK })
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label="Request headers"
        configKey={ConfigKeys.REQUEST_HEADERS_CHECK}
        contentType={fields[ConfigKeys.REQUEST_BODY_CHECK].type}
        setFields={setFields}
      />
      <EuiFormRow label="Request body" fullWidth>
        <EuiPanel borderRadius="none">
          <RequestBody fields={fields} setFields={setFields} />
        </EuiPanel>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationResponseSettingsSectionTitle"
              defaultMessage="Response checks"
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
        <EuiFormRow label="Check response status equals" labelAppend={<OptionalLabel />}>
          <ComboBox
            configKey={ConfigKeys.RESPONSE_STATUS_CHECK}
            selectedOptions={fields[ConfigKeys.RESPONSE_STATUS_CHECK]}
            setFields={setFields}
          />
        </EuiFormRow>
        <EuiFormRow label="Check response contains" labelAppend={<OptionalLabel />}>
          <ComboBox
            configKey={ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE}
            selectedOptions={fields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]}
            setFields={setFields}
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
            selectedOptions={fields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]}
            setFields={setFields}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label="Check response headers"
        configKey={ConfigKeys.RESPONSE_HEADERS_CHECK}
        setFields={setFields}
      />
    </EuiAccordion>
  );
};

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
