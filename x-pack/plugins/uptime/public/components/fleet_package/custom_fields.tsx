/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, memo } from 'react';
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
import { ConfigKeys, DataStream, ISimpleFields, Validation } from './types';
import { useSimpleFieldsContext } from './contexts';
import { TLSFields, TLSRole } from './tls_fields';
import { ComboBox } from './combo_box';
import { OptionalLabel } from './optional_label';
import { HTTPAdvancedFields } from './http_advanced_fields';
import { TCPAdvancedFields } from './tcp_advanced_fields';
import { ScheduleField } from './schedule_field';

interface Props {
  typeEditable?: boolean;
  isTLSEnabled?: boolean;
  validate: Validation;
}

export const CustomFields = memo<Props>(
  ({ typeEditable = false, isTLSEnabled: defaultIsTLSEnabled = false, validate }) => {
    const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
    const { fields, setFields, defaultValues } = useSimpleFieldsContext();
    const { type } = fields;

    const isHTTP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.HTTP;
    const isTCP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.TCP;
    const isICMP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.ICMP;

    // reset monitor type specific fields any time a monitor type is switched
    useEffect(() => {
      if (typeEditable) {
        setFields((prevFields: ISimpleFields) => ({
          ...prevFields,
          [ConfigKeys.HOSTS]: defaultValues[ConfigKeys.HOSTS],
          [ConfigKeys.URLS]: defaultValues[ConfigKeys.URLS],
        }));
      }
    }, [defaultValues, type, typeEditable, setFields]);

    const handleInputChange = ({ value, configKey }: { value: unknown; configKey: ConfigKeys }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    };

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
          data-test-subj="monitorSettingsSection"
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
                    data-test-subj="syntheticsMonitorTypeField"
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
                    data-test-subj="syntheticsUrlField"
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
                    data-test-subj="syntheticsTCPHostField"
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
                    data-test-subj="syntheticsICMPHostField"
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
                  data-test-subj="syntheticsAPMServiceName"
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
                    defaultMessage="A list of tags that will be sent with the monitor event. Press enter to add a new tab. Displayed in Uptime and enables searching by tag."
                  />
                }
              >
                <ComboBox
                  selectedOptions={fields[ConfigKeys.TAGS]}
                  onChange={(value) => handleInputChange({ value, configKey: ConfigKeys.TAGS })}
                  data-test-subj="syntheticsTags"
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
            data-test-subj="syntheticsIsTLSEnabled"
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
            <TLSFields tlsRole={TLSRole.CLIENT} isEnabled={isTLSEnabled} />
          </EuiDescribedFormGroup>
        )}
        <EuiSpacer size="m" />
        {isHTTP && <HTTPAdvancedFields validate={validate} />}
        {isTCP && <TCPAdvancedFields />}
      </EuiForm>
    );
  }
);

const dataStreamOptions = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
