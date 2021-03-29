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
  EuiLink,
  EuiCheckbox,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
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
      (values) =>
        setFields((prevFields) => ({
          ...prevFields,
          ...values,
        })),
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
              defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
              values={{
                link: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.heartbeatDocs"
                      defaultMessage="Heartbeat docs"
                    />
                  </EuiLink>
                ),
              }}
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
                {(isHTTP || isTCP) && (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.proxyURL"
                        defaultMessage="Proxy URL"
                      />
                    }
                    labelAppend={<OptionalLabel />}
                  >
                    <EuiFieldText
                      value={fields[ConfigKeys.PROXY_URL]}
                      onChange={(event) =>
                        handleInputChange({
                          value: event.target.value,
                          configKey: ConfigKeys.PROXY_URL,
                        })
                      }
                    />
                  </EuiFormRow>
                )}
                {isTCP && !!fields[ConfigKeys.PROXY_URL] && (
                  <EuiFormRow>
                    <EuiCheckbox
                      id={'uptimeFleetUseLocalResolverCheckbox'}
                      checked={fields[ConfigKeys.PROXY_USE_LOCAL_RESOLVER]}
                      label={
                        <FormattedMessage
                          id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.resolveHostnamesLocally"
                          defaultMessage="Resolve hostnames locally"
                        />
                      }
                      onChange={(event) =>
                        handleInputChange({
                          value: event.target.checked,
                          configKey: ConfigKeys.PROXY_USE_LOCAL_RESOLVER,
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
                        id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.wait"
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
                  >
                    <EuiFieldNumber
                      min={0}
                      value={fields[ConfigKeys.WAIT]}
                      onChange={(event) =>
                        handleInputChange({ value: event.target.value, configKey: ConfigKeys.WAIT })
                      }
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.APMServiceName"
                      defaultMessage="APM service name"
                    />
                  }
                  labelAppend={<OptionalLabel />}
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
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.timeout"
                      defaultMessage="Timeout in milliseconds"
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
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.tags"
                      defaultMessage="Tags"
                    />
                  }
                  labelAppend={<OptionalLabel />}
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
        {isHTTP && (
          <HTTPAdvancedFields
            defaultValues={{
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
