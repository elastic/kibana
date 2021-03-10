/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { ConfigKeys, DataStream, ICustomFields } from './types';
import { ComboBox } from './combo_box';
import { OptionalLabel } from './optional_label';
import { HTTPAdvancedFields } from './http_advanced_fields';
import { TCPAdvancedFields } from './tcp_advanced_fields';

interface Props {
  defaultValues: ICustomFields;
  onChange: (fields: ICustomFields) => void;
}

export const CustomFields = ({ defaultValues, onChange }: Props) => {
  const [fields, setFields] = useState<ICustomFields>(defaultValues);

  const isHTTP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.HTTP;
  const isTCP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.TCP;
  const isICMP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.ICMP;

  // reset monitor type specific fields any time a monitor type is switched
  useEffect(() => {
    setFields((prevFields) => ({
      ...prevFields,
      [ConfigKeys.HOSTS]: defaultValues[ConfigKeys.HOSTS],
      [ConfigKeys.PORTS]: defaultValues[ConfigKeys.PORTS],
      [ConfigKeys.URLS]: defaultValues[ConfigKeys.URLS],
    }));
  }, [defaultValues, fields.type]);

  useDebounce(
    () => {
      // urls and schedule is managed by us, name is managed by fleet
      onChange(fields);
    },
    250,
    [fields]
  );

  useEffect(() => {
    // urls and schedule is managed by us, name is managed by fleet
    setFields(defaultValues);
  }, [defaultValues]);

  const handleInputChange = useCallback(
    ({
      event,
      configKey,
    }: {
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
      configKey: ConfigKeys;
    }) => {
      setFields({ ...fields, [configKey]: event.target.value });
    },
    [fields]
  );

  const handleCheckboxChange = useCallback(
    ({
      event,
      configKey,
    }: {
      event: React.ChangeEvent<HTMLInputElement>;
      configKey: ConfigKeys;
    }) => {
      setFields({ ...fields, [configKey]: event.target.checked });
    },
    [fields]
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
                    id="xpack.uptime.createPackagePolicy.stepConfigure.heartbeatDocs"
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
              <EuiFormRow
                label="Monitor Type"
                isInvalid={!fields[ConfigKeys.MONITOR_TYPE]}
                error={!fields[ConfigKeys.MONITOR_TYPE] ? ['Monitor type is required'] : undefined}
              >
                <EuiSelect
                  options={dataStreamOptions}
                  value={fields[ConfigKeys.MONITOR_TYPE]}
                  onChange={(event) =>
                    handleInputChange({ event, configKey: ConfigKeys.MONITOR_TYPE })
                  }
                />
              </EuiFormRow>
              {isHTTP && (
                <EuiFormRow
                  label="URL"
                  isInvalid={!fields[ConfigKeys.URLS]}
                  error={!fields[ConfigKeys.URLS] ? ['URL is required'] : undefined}
                >
                  <EuiFieldText
                    value={fields[ConfigKeys.URLS]}
                    onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.URLS })}
                  />
                </EuiFormRow>
              )}
              {(isTCP || isICMP) && (
                <EuiFormRow
                  label="Host"
                  isInvalid={!fields[ConfigKeys.HOSTS]}
                  error={!fields[ConfigKeys.HOSTS] ? ['Host is required'] : undefined}
                >
                  <EuiFieldText
                    value={fields[ConfigKeys.HOSTS]}
                    onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.HOSTS })}
                  />
                </EuiFormRow>
              )}
              {isTCP && (
                <EuiFormRow label="Port" labelAppend={<OptionalLabel />}>
                  <EuiFieldText
                    value={fields[ConfigKeys.PORTS]}
                    onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.PORTS })}
                  />
                </EuiFormRow>
              )}
              <EuiFormRow
                label="Monitor interval in seconds"
                isInvalid={!fields[ConfigKeys.SCHEDULE] || fields[ConfigKeys.SCHEDULE] < 1}
                error={
                  !fields[ConfigKeys.SCHEDULE] || fields[ConfigKeys.SCHEDULE] < 1
                    ? ['Schedule is required']
                    : undefined
                }
              >
                <EuiFieldNumber
                  min={1}
                  value={fields[ConfigKeys.SCHEDULE]}
                  onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.SCHEDULE })}
                />
              </EuiFormRow>
              {isICMP && (
                <EuiFormRow
                  label="Wait in seconds"
                  isInvalid={!fields[ConfigKeys.WAIT] || fields[ConfigKeys.WAIT] < 1}
                  error={
                    !fields[ConfigKeys.WAIT] || fields[ConfigKeys.WAIT] < 1
                      ? ['Schedule is required']
                      : undefined
                  }
                  labelAppend={<OptionalLabel />}
                >
                  <EuiFieldNumber
                    min={1}
                    value={fields[ConfigKeys.WAIT]}
                    onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.WAIT })}
                  />
                </EuiFormRow>
              )}
              <EuiFormRow label="APM Service Name" labelAppend={<OptionalLabel />}>
                <EuiFieldText
                  value={fields[ConfigKeys.SERVICE_NAME]}
                  onChange={(event) =>
                    handleInputChange({ event, configKey: ConfigKeys.SERVICE_NAME })
                  }
                />
              </EuiFormRow>
              <EuiFormRow label="Max redirects" labelAppend={<OptionalLabel />}>
                <EuiFieldNumber
                  min={0}
                  value={fields[ConfigKeys.MAX_REDIRECTS]}
                  onChange={(event) =>
                    handleInputChange({ event, configKey: ConfigKeys.MAX_REDIRECTS })
                  }
                />
              </EuiFormRow>
              {isHTTP && isTCP && (
                <EuiFormRow label="Proxy URL" labelAppend={<OptionalLabel />}>
                  <EuiFieldText
                    value={fields[ConfigKeys.PROXY_URL]}
                    onChange={(event) =>
                      handleInputChange({ event, configKey: ConfigKeys.PROXY_URL })
                    }
                  />
                </EuiFormRow>
              )}
              {isTCP && !!fields[ConfigKeys.PROXY_URL] && (
                <EuiFormRow>
                  <EuiCheckbox
                    id={'uptimeFleetUseLocalResolverCheckbox'}
                    checked={fields[ConfigKeys.PROXY_USE_LOCAL_RESOLVER]}
                    label="Resolve hostnames locally"
                    onChange={(event) =>
                      handleCheckboxChange({
                        event,
                        configKey: ConfigKeys.PROXY_USE_LOCAL_RESOLVER,
                      })
                    }
                  />
                </EuiFormRow>
              )}
              <EuiFormRow label="Timeout in milliseconds" labelAppend={<OptionalLabel />}>
                <EuiFieldNumber
                  min={0}
                  value={fields[ConfigKeys.TIMEOUT]}
                  onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.TIMEOUT })}
                />
              </EuiFormRow>
              <EuiFormRow label="Tags" labelAppend={<OptionalLabel />}>
                <ComboBox
                  configKey={ConfigKeys.TAGS}
                  selectedOptions={fields[ConfigKeys.TAGS]}
                  setFields={setFields}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
      {isHTTP && (
        <HTTPAdvancedFields
          fields={fields}
          onCheckboxChange={handleCheckboxChange}
          onInputChange={handleInputChange}
          setFields={setFields}
        />
      )}
      {isTCP && (
        <TCPAdvancedFields
          fields={fields}
          onCheckboxChange={handleCheckboxChange}
          onInputChange={handleInputChange}
          setFields={setFields}
        />
      )}
    </EuiForm>
  );
};

const dataStreamOptions = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
