/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiCheckbox,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { CertsField, SSLRole } from './certs_field';
import { ConfigKeys, DataStream, ICustomFields, Validation } from './types';
import { ComboBox } from './combo_box';
import { OptionalLabel } from './optional_label';
import { HTTPAdvancedFields } from './http_advanced_fields';
import { TCPAdvancedFields } from './tcp_advanced_fields';
import { ScheduleField } from './schedule_field';

interface Props {
  defaultValues: ICustomFields;
  typeEditable?: boolean;
  onChange: (fields: ICustomFields) => void;
  validate: Validation;
}

export const CustomFields = memo<Props>(
  ({ defaultValues, typeEditable = false, validate, onChange }) => {
    const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(false);
    const [fields, setFields] = useState<ICustomFields>(defaultValues);
    const { type } = fields;

    const isHTTP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.HTTP;
    const isTCP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.TCP;
    const isICMP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.ICMP;

    // reset monitor type specific fields any time a monitor type is switched
    useEffect(() => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.HOSTS]: defaultValues[ConfigKeys.HOSTS],
        [ConfigKeys.URLS]: defaultValues[ConfigKeys.URLS],
      }));
    }, [defaultValues, type]);

    useEffect(() => {
      if (!isTLSEnabled) {
        setFields((prevFields) => ({
          ...prevFields,
          [ConfigKeys.SSL_CERTIFICATE_AUTHORITIES]: '',
          [ConfigKeys.SSL_CERTIFICATE]: '',
          [ConfigKeys.SSL_KEY]: '',
          [ConfigKeys.SSL_KEY_PASSPHRASE]: '',
          [ConfigKeys.SSL_VERIFICATION_MODE]: undefined,
        }));
      }
    }, [isTLSEnabled]);

    useDebounce(
      () => {
        onChange(fields);
      },
      250,
      [onChange, fields]
    );

    const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    };

    const onChangeAdvancedFields = useCallback(
      (values) =>
        setFields((prevFields) => ({
          ...prevFields,
          ...values,
        })),
      [setFields]
    );

    const handleChangeCerts = useCallback(
      (certsFields) => {
        setFields((prevFields) => ({
          ...prevFields,
          [ConfigKeys.SSL_CERTIFICATE_AUTHORITIES]: certsFields.certificateAuthorities,
          [ConfigKeys.SSL_CERTIFICATE]: certsFields.certificate,
          [ConfigKeys.SSL_KEY]: certsFields.key,
          [ConfigKeys.SSL_KEY_PASSPHRASE]: certsFields.keyPassphrase,
          [ConfigKeys.SSL_VERIFICATION_MODE]: certsFields.verificationMode,
        }));
      },
      [setFields]
    );

    return (
      <EuiForm>
        <EuiDescribedFormGroup
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
              defaultMessage="Configure your Heartbeat monitor with the following options."
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiForm component="form">
                {typeEditable && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType"
                        defaultMessage="Monitor Type"
                      />
                    }
                    isInvalid={
                      !!validate[ConfigKeys.MONITOR_TYPE]?.(fields[ConfigKeys.MONITOR_TYPE])
                    }
                    error={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType.error"
                        defaultMessage="Monitor type is required"
                      />
                    }
                  >
                    <EuiSelect
                      options={dataStreamOptions}
                      value={fields[ConfigKeys.MONITOR_TYPE]}
                      onChange={(event) =>
                        handleInputChange({
                          value: event.target.value,
                          configKey: ConfigKeys.MONITOR_TYPE,
                        })
                      }
                    />
                  </EuiFormRow>
                )}
                {isHTTP && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL"
                        defaultMessage="URL"
                      />
                    }
                    isInvalid={!!validate[ConfigKeys.URLS]?.(fields[ConfigKeys.URLS])}
                    error={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.URL.error"
                        defaultMessage="URL is required"
                      />
                    }
                  >
                    <EuiFieldText
                      value={fields[ConfigKeys.URLS]}
                      onChange={(event) =>
                        handleInputChange({ value: event.target.value, configKey: ConfigKeys.URLS })
                      }
                    />
                  </EuiFormRow>
                )}
                {(isTCP || isICMP) && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.hosts"
                        defaultMessage="Host"
                      />
                    }
                    isInvalid={!!validate[ConfigKeys.HOSTS]?.(fields[ConfigKeys.HOSTS])}
                    error={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.hosts.error"
                        defaultMessage="Host is required"
                      />
                    }
                  >
                    <EuiFieldText
                      value={fields[ConfigKeys.HOSTS]}
                      onChange={(event) =>
                        handleInputChange({
                          value: event.target.value,
                          configKey: ConfigKeys.HOSTS,
                        })
                      }
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow
                  id="syntheticsFleetScheduleField--number syntheticsFleetScheduleField--unit"
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorInterval"
                      defaultMessage="Monitor interval"
                    />
                  }
                  isInvalid={!!validate[ConfigKeys.SCHEDULE]?.(fields[ConfigKeys.SCHEDULE])}
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
                {isICMP && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.label"
                        defaultMessage="Wait in seconds"
                      />
                    }
                    isInvalid={!!validate[ConfigKeys.WAIT]?.(fields[ConfigKeys.WAIT])}
                    error={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.error"
                        defaultMessage="Wait must be 0 or greater"
                      />
                    }
                    labelAppend={<OptionalLabel />}
                    helpText={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait.helpText"
                        defaultMessage="The duration to wait before emitting another ICMP Echo Request if no response is received."
                      />
                    }
                  >
                    <EuiFieldNumber
                      min={0}
                      value={fields[ConfigKeys.WAIT]}
                      onChange={(event) =>
                        handleInputChange({ value: event.target.value, configKey: ConfigKeys.WAIT })
                      }
                      step={'any'}
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.APMServiceName.label"
                      defaultMessage="APM service name"
                    />
                  }
                  labelAppend={<OptionalLabel />}
                  helpText={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.APMServiceName.helpText"
                      defaultMessage="Optional APM service name for this monitor. Corresponds to the service.name ECS field. Set this when monitoring an app that is also using APM to enable integrations between Uptime and APM data in Kibana."
                    />
                  }
                >
                  <EuiFieldText
                    value={fields[ConfigKeys.APM_SERVICE_NAME]}
                    onChange={(event) =>
                      handleInputChange({
                        value: event.target.value,
                        configKey: ConfigKeys.APM_SERVICE_NAME,
                      })
                    }
                  />
                </EuiFormRow>
                {isHTTP && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects"
                        defaultMessage="Max redirects"
                      />
                    }
                    isInvalid={
                      !!validate[ConfigKeys.MAX_REDIRECTS]?.(fields[ConfigKeys.MAX_REDIRECTS])
                    }
                    error={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects.error"
                        defaultMessage="Max redirects must be 0 or greater"
                      />
                    }
                    labelAppend={<OptionalLabel />}
                    helpText={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.maxRedirects.helpText"
                        defaultMessage="The total number of redirections Heartbeat will follow."
                      />
                    }
                  >
                    <EuiFieldNumber
                      min={0}
                      value={fields[ConfigKeys.MAX_REDIRECTS]}
                      onChange={(event) =>
                        handleInputChange({
                          value: event.target.value,
                          configKey: ConfigKeys.MAX_REDIRECTS,
                        })
                      }
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.label"
                      defaultMessage="Timeout in seconds"
                    />
                  }
                  isInvalid={fields[ConfigKeys.TIMEOUT] < 0}
                  error={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.error"
                      defaultMessage="Timeout must be 0 or greater"
                    />
                  }
                  labelAppend={<OptionalLabel />}
                  helpText={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.helpText"
                      defaultMessage="The total time allowed for testing the connection and exchanging data."
                    />
                  }
                >
                  <EuiFieldNumber
                    min={0}
                    value={fields[ConfigKeys.TIMEOUT]}
                    onChange={(event) =>
                      handleInputChange({
                        value: event.target.value,
                        configKey: ConfigKeys.TIMEOUT,
                      })
                    }
                    step={'any'}
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
                      defaultMessage="A list of tags that will be sent with the monitor event. Displayed in Uptime and enables searching by tag."
                    />
                  }
                >
                  <ComboBox
                    selectedOptions={fields[ConfigKeys.TAGS]}
                    onChange={(value) => handleInputChange({ value, configKey: ConfigKeys.TAGS })}
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.tlsSettings.label"
                defaultMessage="TLS settings"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.tlsSettings.description"
              defaultMessage="Configure TLS options, including verification mode, certificate authorities, and client certificates."
            />
          }
        >
          <EuiCheckbox
            id={'uptimeFleetIsTLSEnabled'}
            checked={isTLSEnabled}
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certificateSettings.enableSSLSettings.label"
                defaultMessage="Enable SSL configuration"
              />
            }
            onChange={(event) => setIsTLSEnabled(event.target.checked)}
          />
          {isTLSEnabled && (
            <CertsField onChange={handleChangeCerts} sslRole={SSLRole.CLIENT} showLegend={false} />
          )}
        </EuiDescribedFormGroup>
        {isHTTP && (
          <HTTPAdvancedFields
            defaultValues={{
              [ConfigKeys.PROXY_URL]: defaultValues[ConfigKeys.PROXY_URL],
              [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]:
                defaultValues[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE],
              [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]:
                defaultValues[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE],
              [ConfigKeys.RESPONSE_BODY_INDEX]: defaultValues[ConfigKeys.RESPONSE_BODY_INDEX],
              [ConfigKeys.RESPONSE_HEADERS_CHECK]: defaultValues[ConfigKeys.RESPONSE_HEADERS_CHECK],
              [ConfigKeys.RESPONSE_HEADERS_INDEX]: defaultValues[ConfigKeys.RESPONSE_HEADERS_INDEX],
              [ConfigKeys.RESPONSE_STATUS_CHECK]: defaultValues[ConfigKeys.RESPONSE_STATUS_CHECK],
              [ConfigKeys.REQUEST_BODY_CHECK]: defaultValues[ConfigKeys.REQUEST_BODY_CHECK],
              [ConfigKeys.REQUEST_HEADERS_CHECK]: defaultValues[ConfigKeys.REQUEST_HEADERS_CHECK],
              [ConfigKeys.REQUEST_METHOD_CHECK]: defaultValues[ConfigKeys.REQUEST_METHOD_CHECK],
            }}
            onChange={onChangeAdvancedFields}
            validate={validate}
          />
        )}
        {isTCP && (
          <TCPAdvancedFields
            defaultValues={{
              [ConfigKeys.PROXY_URL]: defaultValues[ConfigKeys.PROXY_URL],
              [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]:
                defaultValues[ConfigKeys.PROXY_USE_LOCAL_RESOLVER],
              [ConfigKeys.REQUEST_SEND_CHECK]: defaultValues[ConfigKeys.REQUEST_SEND_CHECK],
              [ConfigKeys.RESPONSE_RECEIVE_CHECK]: defaultValues[ConfigKeys.RESPONSE_RECEIVE_CHECK],
            }}
            onChange={onChangeAdvancedFields}
          />
        )}
      </EuiForm>
    );
  }
);

const dataStreamOptions = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
