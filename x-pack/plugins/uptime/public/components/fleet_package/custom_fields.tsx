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
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [isInvalid, setInvalid] = useState(false);
  const [fields, setFields] = useState<ICustomFields>(defaultValues);

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

  const onCreateOption = (tag: string) => {
    const formattedTag = tag.trim();
    const newOption = {
      label: formattedTag,
    };

    setFields((currentFields) => ({
      ...currentFields,
      [ConfigKeys.TAGS]: [...currentFields[ConfigKeys.TAGS], formattedTag],
    }));

    // Select the option.
    setSelected([...selectedOptions, newOption]);
  };

  const onSearchChange = (searchValue: string) => {
    if (!searchValue) {
      setInvalid(false);

      return;
    }

    setInvalid(!isValid(searchValue));
  };

  const onTagsChange = (tags: Array<EuiComboBoxOptionOption<string>>) => {
    setSelected(tags);
    const formattedTags = tags.map((tag) => tag.label);
    setFields((currentFields) => ({ ...currentFields, [ConfigKeys.TAGS]: formattedTags }));
    setInvalid(false);
  };

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
            <EuiComboBox<string>
              noSuggestions
              selectedOptions={selectedOptions}
              onCreateOption={onCreateOption}
              onChange={onTagsChange}
              onSearchChange={onSearchChange}
              isInvalid={isInvalid}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const options = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
