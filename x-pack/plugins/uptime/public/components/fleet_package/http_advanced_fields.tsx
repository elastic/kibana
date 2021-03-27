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

import { ConfigKeys, HTTPMethod, IHTTPAdvancedFields, Validation } from './types';

import { OptionalLabel } from './optional_label';
import { HeaderField } from './header_field';
import { RequestBodyField } from './request_body_field';
import { ResponseBodyIndexField } from './index_response_body_field';
import { ComboBox } from './combo_box';

interface Props {
  defaultValues: IHTTPAdvancedFields;
  onChange: (values: IHTTPAdvancedFields) => void;
  validate: Validation;
}

export const HTTPAdvancedFields = memo<Props>(({ defaultValues, onChange, validate }) => {
  const [fields, setFields] = useState<IHTTPAdvancedFields>(defaultValues);
  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  useDebounce(
    () => {
      onChange(fields);
    },
    250,
    [fields]
  );

  return (
    <EuiAccordion
      id="uptimeFleetAdvancedOptions"
      buttonContent={
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions"
          defaultMessage="Advanced options"
        />
      }
    >
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.title"
              defaultMessage="Request configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.description"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestMethod"
              defaultMessage="Request method"
            />
          }
        >
          <EuiSelect
            options={requestMethodOptions}
            value={fields[ConfigKeys.REQUEST_METHOD_CHECK]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.REQUEST_METHOD_CHECK,
              })
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestHeaders"
            defaultMessage="Request headers"
          />
        }
        contentMode={
          fields[ConfigKeys.REQUEST_BODY_CHECK].value
            ? fields[ConfigKeys.REQUEST_BODY_CHECK].type
            : undefined
        } // only pass contentMode if the request body is truthy
        defaultValue={defaultValues[ConfigKeys.REQUEST_HEADERS_CHECK]}
        onChange={useCallback(
          (value) =>
            handleInputChange({
              value,
              configKey: ConfigKeys.REQUEST_HEADERS_CHECK,
            }),
          [handleInputChange]
        )}
        isInvalid={
          !!validate[ConfigKeys.REQUEST_HEADERS_CHECK]?.(fields[ConfigKeys.REQUEST_HEADERS_CHECK])
        }
      />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestBody"
            defaultMessage="Request body"
          />
        }
        fullWidth
      >
        <RequestBodyField
          value={fields[ConfigKeys.REQUEST_BODY_CHECK].value}
          type={fields[ConfigKeys.REQUEST_BODY_CHECK].type}
          onChange={useCallback(
            (value) =>
              handleInputChange({
                value,
                configKey: ConfigKeys.REQUEST_BODY_CHECK,
              }),
            [handleInputChange]
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfiguration.title"
              defaultMessage="Response configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfiguration.description"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfiguration.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiSpacer size="s" />
        <ResponseBodyIndexField
          defaultValue={defaultValues[ConfigKeys.RESPONSE_BODY_INDEX]}
          onChange={useCallback(
            (policy) =>
              handleInputChange({ value: policy, configKey: ConfigKeys.RESPONSE_BODY_INDEX }),
            [handleInputChange]
          )}
        />
        <EuiFormRow>
          <EuiCheckbox
            id={'uptimeFleetIndexResponseHeaders'}
            checked={fields[ConfigKeys.RESPONSE_HEADERS_INDEX]}
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfig.indexResponseHeaders"
                defaultMessage="Index response headers"
              />
            }
            onChange={(event) =>
              handleInputChange({
                value: event.target.checked,
                configKey: ConfigKeys.RESPONSE_HEADERS_INDEX,
              })
            }
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.title"
              defaultMessage="Response checks"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.description"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseStatusEquals"
              defaultMessage="Check response status equals"
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <ComboBox
            selectedOptions={fields[ConfigKeys.RESPONSE_STATUS_CHECK]}
            onChange={(value) =>
              handleInputChange({
                value,
                configKey: ConfigKeys.RESPONSE_STATUS_CHECK,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseBodyContains"
              defaultMessage="Check response body contains"
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <ComboBox
            selectedOptions={fields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]}
            onChange={useCallback(
              (value) =>
                handleInputChange({
                  value,
                  configKey: ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE,
                }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseBodyDoesNotContain"
                defaultMessage="Check response body does not contain"
              />{' '}
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
            selectedOptions={fields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]}
            onChange={useCallback(
              (value) =>
                handleInputChange({
                  value,
                  configKey: ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE,
                }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <HeaderField
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.checkResponseHeadersContain"
            defaultMessage="Check response headers contain"
          />
        }
        defaultValue={defaultValues[ConfigKeys.RESPONSE_HEADERS_CHECK]}
        onChange={useCallback(
          (value) =>
            handleInputChange({
              value,
              configKey: ConfigKeys.RESPONSE_HEADERS_CHECK,
            }),
          [handleInputChange]
        )}
        isInvalid={
          !!validate[ConfigKeys.RESPONSE_HEADERS_CHECK]?.(fields[ConfigKeys.RESPONSE_HEADERS_CHECK])
        }
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
