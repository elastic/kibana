/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiSelect,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { ConfigKeys, DataStream, ICustomFields } from './types';
/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */

interface Props {
  defaultValues: ICustomFields;
  onChange: (fields: ICustomFields) => void;
}

const isValid = (value: string) => {
  // Ensure that the tag is more than whitespace
  return value.match(/\S/) !== null;
};

export const CustomFields = ({ defaultValues, onChange }: Props) => {
  const [fields, setFields] = useState<ICustomFields>(defaultValues);

  const isHTTP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.HTTP;
  const isTCP = fields[ConfigKeys.MONITOR_TYPE] === DataStream.TCP;

  useDebounce(
    () => {
      // urls and schedule is managed by us, name is managed by fleet
      onChange(fields);
    },
    250,
    [fields]
  );

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

  return (
    <EuiFlexGroup>
      <EuiFlexItem />
      <EuiFlexItem>
        <EuiForm component="form">
          <EuiFormRow
            label="Monitor Type"
            isInvalid={!fields[ConfigKeys.MONITOR_TYPE]}
            error={!fields[ConfigKeys.MONITOR_TYPE] ? ['Monitor type is required'] : undefined}
          >
            <EuiSelect
              options={options}
              value={fields[ConfigKeys.MONITOR_TYPE]}
              onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.MONITOR_TYPE })}
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
          {isTCP && (
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
            <EuiFormRow label="Ports">
              <ComboBox
                configKey={ConfigKeys.PORTS}
                selectedOptions={fields[ConfigKeys.PORTS]}
                setFields={setFields}
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
          <EuiFormRow label="APM Service Name">
            <EuiFieldText
              value={fields[ConfigKeys.SERVICE_NAME]}
              onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.SERVICE_NAME })}
            />
          </EuiFormRow>
          <EuiFormRow label="Max redirects">
            <EuiFieldNumber
              min={0}
              value={fields[ConfigKeys.MAX_REDIRECTS]}
              onChange={(event) =>
                handleInputChange({ event, configKey: ConfigKeys.MAX_REDIRECTS })
              }
            />
          </EuiFormRow>
          <EuiFormRow label="Proxy URL">
            <EuiFieldText
              value={fields[ConfigKeys.PROXY_URL]}
              onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.PROXY_URL })}
            />
          </EuiFormRow>
          <EuiFormRow label="Timeout in milliseconds">
            <EuiFieldNumber
              min={0}
              value={fields[ConfigKeys.TIMEOUT]}
              onChange={(event) => handleInputChange({ event, configKey: ConfigKeys.TIMEOUT })}
            />
          </EuiFormRow>
          <EuiFormRow label="Tags">
            <ComboBox
              configKey={ConfigKeys.TAGS}
              selectedOptions={fields[ConfigKeys.TAGS]}
              setFields={setFields}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type ComboBoxKeys = ConfigKeys.PORTS | ConfigKeys.TAGS;

const ComboBox = ({
  configKey,
  setFields,
  selectedOptions,
}: {
  configKey: ComboBoxKeys;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
  selectedOptions: string[];
}) => {
  const [formattedSelectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(selectedOptions.map((option) => ({ label: option, key: option })));
  const [isInvalid, setInvalid] = useState(false);

  const onOptionsChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(options);
    const formattedTags = options.map((option) => option.label);
    setFields((currentFields) => ({ ...currentFields, [configKey]: formattedTags }));
    setInvalid(false);
  };

  const onCreateOption = (tag: string) => {
    const formattedTag = tag.trim();
    const newOption = {
      label: formattedTag,
    };

    setFields((currentFields) => ({
      ...currentFields,
      [configKey]: [...currentFields[configKey], formattedTag],
    }));

    // Select the option.
    setSelectedOptions([...formattedSelectedOptions, newOption]);
  };

  const onSearchChange = (searchValue: string) => {
    if (!searchValue) {
      setInvalid(false);

      return;
    }

    setInvalid(!isValid(searchValue));
  };

  return (
    <EuiComboBox<string>
      noSuggestions
      selectedOptions={formattedSelectedOptions}
      onCreateOption={onCreateOption}
      onChange={onOptionsChange}
      onSearchChange={onSearchChange}
      isInvalid={isInvalid}
    />
  );
};

const options = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
