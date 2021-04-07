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
  EuiSpacer,
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
  isTLSEnabled?: boolean;
  onChange: (fields: ICustomFields) => void;
  validate: Validation;
}

export const CustomFields = memo<Props>(
  ({
    defaultValues,
    typeEditable = false,
    isTLSEnabled: defaultIsTLSEnabled = false,
    validate,
    onChange,
  }) => {
    const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
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
      (values: Partial<ICustomFields>) =>
        setFields((prevFields) => ({
          ...prevFields,
          ...values,
        })),
      [setFields]
    );

    return (
      <EuiForm component="form">
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
              defaultMessage="Configure your monitor with the following options."
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              {typeEditable && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType"
                      defaultMessage="Monitor Type"
                    />
                  }
                  isInvalid={!!validate[ConfigKeys.MONITOR_TYPE]?.(fields[ConfigKeys.MONITOR_TYPE])}
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
              {isTCP && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts"
                      defaultMessage="Host:Port"
                    />
                  }
                  isInvalid={!!validate[ConfigKeys.HOSTS]?.(fields[ConfigKeys.HOSTS])}
                  error={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tcp.hosts.error"
                      defaultMessage="Host and port are required"
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
              {isICMP && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts"
                      defaultMessage="Host"
                    />
                  }
                  isInvalid={!!validate[ConfigKeys.HOSTS]?.(fields[ConfigKeys.HOSTS])}
                  error={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.icmp.hosts.error"
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
                    defaultMessage="APM service name for this monitor. Corresponds to the service.name ECS field. Set this when monitoring an app that is also using APM to enable integrations between Uptime and APM data in Kibana."
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
                      defaultMessage="The total number of redirections to follow."
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
                isInvalid={
                  !!validate[ConfigKeys.TIMEOUT]?.(
                    fields[ConfigKeys.TIMEOUT],
                    fields[ConfigKeys.SCHEDULE].number,
                    fields[ConfigKeys.SCHEDULE].unit
                  )
                }
                error={
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout.error"
                    defaultMessage="Timeout must be 0 or greater and less than schedule interval"
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescribedFormGroup>
        {(isHTTP || isTCP) && (
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
                  defaultMessage="Enable TLS configuration"
                />
              }
              onChange={(event) => setIsTLSEnabled(event.target.checked)}
            />
            <CertsField
              onChange={onChangeAdvancedFields}
              sslRole={SSLRole.CLIENT}
              isEnabled={isTLSEnabled}
              defaultValues={{
                [ConfigKeys.TLS_VERIFICATION_MODE]: defaultValues[ConfigKeys.TLS_VERIFICATION_MODE],
                [ConfigKeys.TLS_VERSION]: defaultValues[ConfigKeys.TLS_VERSION],
                [ConfigKeys.TLS_KEY]: defaultValues[ConfigKeys.TLS_KEY],
                [ConfigKeys.TLS_CERTIFICATE]: defaultValues[ConfigKeys.TLS_CERTIFICATE],
                [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]:
                  defaultValues[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
                [ConfigKeys.TLS_KEY_PASSPHRASE]: defaultValues[ConfigKeys.TLS_KEY_PASSPHRASE],
              }}
            />
          </EuiDescribedFormGroup>
        )}
        <EuiSpacer size="m" />
        {isHTTP && (
          <HTTPAdvancedFields
            defaultValues={{
              [ConfigKeys.PASSWORD]: defaultValues[ConfigKeys.PASSWORD],
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
              [ConfigKeys.USERNAME]: defaultValues[ConfigKeys.USERNAME],
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
