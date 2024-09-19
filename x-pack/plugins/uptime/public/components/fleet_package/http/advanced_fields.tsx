/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiCheckbox,
  EuiSpacer,
  EuiFieldPassword,
} from '@elastic/eui';

import { useHTTPAdvancedFieldsContext } from '../contexts';

import { ConfigKeys, HTTPMethod, Validation } from '../types';

import { OptionalLabel } from '../optional_label';
import { HeaderField } from '../header_field';
import { RequestBodyField } from '../request_body_field';
import { ResponseBodyIndexField } from '../index_response_body_field';
import { ComboBox } from '../combo_box';

interface Props {
  validate: Validation;
}

export const HTTPAdvancedFields = memo<Props>(({ validate }) => {
  const { fields, setFields } = useHTTPAdvancedFieldsContext();
  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  return (
    <EuiAccordion
      id="uptimeFleetHttpAdvancedOptions"
      buttonContent={
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions"
          defaultMessage="Advanced HTTP options"
        />
      }
      data-test-subj="syntheticsHTTPAdvancedFieldsAccordion"
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
        data-test-subj="httpAdvancedFieldsSection"
      >
        <EuiSpacer size="s" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.username.label"
              defaultMessage="Username"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.username.helpText"
              defaultMessage="Username for authenticating with the server."
            />
          }
        >
          <EuiFieldText
            value={fields[ConfigKeys.USERNAME]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.USERNAME,
              })
            }
            data-test-subj="syntheticsUsername"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.password.label"
              defaultMessage="Password"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.password.helpText"
              defaultMessage="Password for authenticating with the server."
            />
          }
        >
          <EuiFieldPassword
            value={fields[ConfigKeys.PASSWORD]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.PASSWORD,
              })
            }
            data-test-subj="syntheticsPassword"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.proxyURL.http.label"
              defaultMessage="Proxy URL"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.proxyUrl.http.helpText"
              defaultMessage="HTTP proxy URL."
            />
          }
        >
          <EuiFieldText
            value={fields[ConfigKeys.PROXY_URL]}
            onChange={(event) =>
              handleInputChange({
                value: event.target.value,
                configKey: ConfigKeys.PROXY_URL,
              })
            }
            data-test-subj="syntheticsProxyUrl"
          />
        </EuiFormRow>
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
            data-test-subj="syntheticsRequestMethod"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestHeaders"
              defaultMessage="Request headers"
            />
          }
          labelAppend={<OptionalLabel />}
          isInvalid={!!validate[ConfigKeys.REQUEST_HEADERS_CHECK]?.(fields)}
          error={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestHeadersField.error"
              defaultMessage="Header key must be a valid HTTP token."
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestHeadersField.helpText"
              defaultMessage="A dictionary of additional HTTP headers to send. By default the client will set the User-Agent header to identify itself."
            />
          }
        >
          <HeaderField
            contentMode={
              fields[ConfigKeys.REQUEST_BODY_CHECK].value
                ? fields[ConfigKeys.REQUEST_BODY_CHECK].type
                : undefined
            } // only pass contentMode if the request body is truthy
            defaultValue={fields[ConfigKeys.REQUEST_HEADERS_CHECK]}
            onChange={useCallback(
              (value) =>
                handleInputChange({
                  value,
                  configKey: ConfigKeys.REQUEST_HEADERS_CHECK,
                }),
              [handleInputChange]
            )}
            data-test-subj="syntheticsRequestHeaders"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestConfiguration.requestBody"
              defaultMessage="Request body"
            />
          }
          labelAppend={<OptionalLabel />}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.requestBody.helpText"
              defaultMessage="Request body content."
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
      </EuiDescribedFormGroup>
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
            <>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText"
                defaultMessage="Controls the indexing of the HTTP response headers to "
              />
              <EuiCode>http.response.body.headers</EuiCode>
            </>
          }
          data-test-subj="syntheticsIndexResponseHeaders"
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
        <EuiFormRow
          helpText={
            <>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseBody.helpText"
                defaultMessage="Controls the indexing of the HTTP response body contents to "
              />
              <EuiCode>http.response.body.contents</EuiCode>
            </>
          }
        >
          <ResponseBodyIndexField
            defaultValue={fields[ConfigKeys.RESPONSE_BODY_INDEX]}
            onChange={useCallback(
              (policy) =>
                handleInputChange({ value: policy, configKey: ConfigKeys.RESPONSE_BODY_INDEX }),
              [handleInputChange]
            )}
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
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseStatusCheck.label"
              defaultMessage="Check response status equals"
            />
          }
          labelAppend={<OptionalLabel />}
          isInvalid={!!validate[ConfigKeys.RESPONSE_STATUS_CHECK]?.(fields)}
          error={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseStatusCheck.error"
              defaultMessage="Status code must contain digits only."
            />
          }
          helpText={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.responseStatusCheck.helpText',
            {
              defaultMessage:
                'A list of expected status codes. Press enter to add a new code. 4xx and 5xx codes are considered down by default. Other codes are considered up.',
            }
          )}
        >
          <ComboBox
            selectedOptions={fields[ConfigKeys.RESPONSE_STATUS_CHECK]}
            onChange={(value) =>
              handleInputChange({
                value,
                configKey: ConfigKeys.RESPONSE_STATUS_CHECK,
              })
            }
            data-test-subj="syntheticsResponseStatusCheck"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseChecks.checkResponseHeadersContain"
              defaultMessage="Check response headers contain"
            />
          }
          labelAppend={<OptionalLabel />}
          isInvalid={!!validate[ConfigKeys.RESPONSE_HEADERS_CHECK]?.(fields)}
          error={[
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseHeadersField.error"
              defaultMessage="Header key must be a valid HTTP token."
            />,
          ]}
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseHeadersField.helpText"
              defaultMessage="A list of expected response headers."
            />
          }
        >
          <HeaderField
            defaultValue={fields[ConfigKeys.RESPONSE_HEADERS_CHECK]}
            onChange={useCallback(
              (value) =>
                handleInputChange({
                  value,
                  configKey: ConfigKeys.RESPONSE_HEADERS_CHECK,
                }),
              [handleInputChange]
            )}
            data-test-subj="syntheticsResponseHeaders"
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
          helpText={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseBodyCheckPositive.helpText',
            {
              defaultMessage:
                'A list of regular expressions to match the body output. Press enter to add a new expression. Only a single expression needs to match.',
            }
          )}
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
            data-test-subj="syntheticsResponseBodyCheckPositive"
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
          helpText={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseBodyCheckNegative.helpText',
            {
              defaultMessage:
                'A list of regular expressions to match the the body output negatively. Press enter to add a new expression. Return match failed if single expression matches.',
            }
          )}
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
            data-test-subj="syntheticsResponseBodyCheckNegative"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
});

const requestMethodOptions = Object.values(HTTPMethod).map((method) => ({
  value: method,
  text: method,
}));
