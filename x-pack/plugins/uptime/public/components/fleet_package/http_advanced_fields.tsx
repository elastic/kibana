/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, memo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import ReactMarkdown from 'react-markdown';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiCheckbox,
  EuiSpacer,
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
            defaultMessage="Configure an optional request to send to the remote host including method, body, and headers."
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestMethod.label"
              defaultMessage="Request method"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestMethod.helpText"
              defaultMessage="The HTTP method to use."
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
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestHeaders"
            defaultMessage="Request headers"
          />
        }
        isInvalid={
          !!validate[ConfigKeys.REQUEST_HEADERS_CHECK]?.(fields[ConfigKeys.REQUEST_HEADERS_CHECK])
        }
        error={
          !!validate[ConfigKeys.REQUEST_HEADERS_CHECK]?.(fields[ConfigKeys.REQUEST_HEADERS_CHECK])
            ? [
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestHeadersField.error"
                  defaultMessage="Header key must be a valid HTTP token."
                />,
              ]
            : undefined
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestHeadersField.helpText"
            defaultMessage="A dictionary of additional HTTP headers to send. By default heartbeat will set the User-Agent header to identify itself."
          />
        }
      >
        <HeaderField
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
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestBody"
            defaultMessage="Request body"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestBody.helpText"
            defaultMessage="Optional request body content."
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
            defaultMessage="Control the indexing of the HTTP response contents."
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          helpText={
            <ReactMarkdown
              source={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseBody.helpText',
                {
                  defaultMessage:
                    'Controls the indexing of the HTTP response body contents to the `http.response.body.contents` field.',
                }
              )}
            />
          }
        >
          <ResponseBodyIndexField
            defaultValue={defaultValues[ConfigKeys.RESPONSE_BODY_INDEX]}
            onChange={useCallback(
              (policy) =>
                handleInputChange({ value: policy, configKey: ConfigKeys.RESPONSE_BODY_INDEX }),
              [handleInputChange]
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          helpText={
            <ReactMarkdown
              source={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText',
                {
                  defaultMessage:
                    'Controls the indexing of the HTTP response headers `http.response.body.headers` field.',
                }
              )}
            />
          }
        >
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
            defaultMessage="Configure the expected HTTP response."
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
          helpText={
            <ReactMarkdown
              source={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseStatusCheck.helpText',
                {
                  defaultMessage:
                    'A list of expected status codes. 4xx and 5xx codes are considered down by default. Other codes are considered `up`.',
                }
              )}
            />
          }
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
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseCheckPositive.label"
              defaultMessage="Check response body contains"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <ReactMarkdown
              source={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseBodyCheckPositive.helpText',
                {
                  defaultMessage:
                    'A list of regular expressions to match the body output. Only a single expression needs to match.',
                }
              )}
            />
          }
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
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseCheckNegative.label"
              defaultMessage="Check response body does not contain"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <ReactMarkdown
              source={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseBodyCheckNegative.helpText',
                {
                  defaultMessage:
                    'A list of regular expressions to match the the body output negatively. Return match failed if single expression matches.',
                }
              )}
            />
          }
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
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.checkResponseHeadersContain"
            defaultMessage="Check response headers contain"
          />
        }
        isInvalid={
          !!validate[ConfigKeys.RESPONSE_HEADERS_CHECK]?.(fields[ConfigKeys.RESPONSE_HEADERS_CHECK])
        }
        error={
          !!validate[ConfigKeys.RESPONSE_HEADERS_CHECK]?.(fields[ConfigKeys.RESPONSE_HEADERS_CHECK])
            ? [
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseHeadersField.error"
                  defaultMessage="Header key must be a valid HTTP token."
                />,
              ]
            : undefined
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseHeadersField.helpText"
            defaultMessage="The required response headers."
          />
        }
      >
        <HeaderField
          defaultValue={defaultValues[ConfigKeys.RESPONSE_HEADERS_CHECK]}
          onChange={useCallback(
            (value) =>
              handleInputChange({
                value,
                configKey: ConfigKeys.RESPONSE_HEADERS_CHECK,
              }),
            [handleInputChange]
          )}
        />
      </EuiFormRow>
    </EuiAccordion>
  );
});

const requestMethodOptions = Object.values(HTTPMethod).map((method) => ({
  value: method,
  text: method,
}));
