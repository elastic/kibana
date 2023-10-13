/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiAccordion,
  EuiFieldText,
  EuiFieldPassword,
  EuiRadioGroup,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DisplayType } from '@kbn/search-connectors';

import { PlatinumLicensePopover } from '../../shared/platinum_license_popover/platinum_license_popover';

import { ConfigEntryView } from './connector_configuration_config';
import { DocumentLevelSecurityPanel } from './document_level_security/document_level_security_panel';
import { ensureBooleanType, ensureStringType } from './utils/connector_configuration_utils';

interface ConnectorConfigurationFieldProps {
  configEntry: ConfigEntryView;
  hasPlatinumLicense: boolean;
  isLoading: boolean;
  setConfigValue: (value: number | string | boolean) => void;
}

export const ConnectorConfigurationField: React.FC<ConnectorConfigurationFieldProps> = ({
  configEntry,
  hasPlatinumLicense,
  isLoading,
  setConfigValue,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {
    key,
    display,
    is_valid: isValid,
    label,
    options,
    required,
    placeholder,
    sensitive,
    tooltip,
    value,
  } = configEntry;

  switch (display) {
    case DisplayType.DROPDOWN:
      return options.length > 3 ? (
        <EuiSelect
          disabled={isLoading}
          options={options.map((option) => ({ text: option.label, value: option.value }))}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            setConfigValue(event.target.value);
          }}
        />
      ) : (
        <EuiRadioGroup
          disabled={isLoading}
          idSelected={ensureStringType(value)}
          name="radio group"
          options={options.map((option) => ({ id: option.value, label: option.label }))}
          onChange={(id) => {
            setConfigValue(id);
          }}
        />
      );

    case DisplayType.NUMERIC:
      return (
        <EuiFieldText
          disabled={isLoading}
          required={required}
          value={ensureStringType(value)}
          isInvalid={!isValid}
          onChange={(event) => {
            setConfigValue(event.target.value);
          }}
          placeholder={placeholder}
        />
      );

    case DisplayType.TEXTAREA:
      const textarea = (
        <EuiTextArea
          disabled={isLoading}
          placeholder={placeholder}
          required={required}
          value={ensureStringType(value) || undefined} // ensures placeholder shows up when value is empty string
          onChange={(event) => {
            setConfigValue(event.target.value);
          }}
        />
      );

      return sensitive ? (
        <EuiAccordion
          id={key + '-accordion'}
          buttonContent={
            tooltip ? (
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>
                  <p>{label}</p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="questionInCircle" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <p>{label}</p>
            )
          }
        >
          {textarea}
        </EuiAccordion>
      ) : (
        textarea
      );

    case DisplayType.TOGGLE:
      if (key === 'use_document_level_security') {
        return (
          <DocumentLevelSecurityPanel
            toggleSwitch={
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    checked={ensureBooleanType(value)}
                    disabled={isLoading || !hasPlatinumLicense}
                    label={<p>{label}</p>}
                    onChange={(event) => {
                      setConfigValue(event.target.checked);
                    }}
                  />
                </EuiFlexItem>
                {!hasPlatinumLicense && (
                  <EuiFlexItem grow={false}>
                    <PlatinumLicensePopover
                      button={
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.selectConnector.openPopoverLabel',
                            {
                              defaultMessage: 'Open licensing popover',
                            }
                          )}
                          iconType="questionInCircle"
                          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                        />
                      }
                      closePopover={() => setIsPopoverOpen(false)}
                      isPopoverOpen={isPopoverOpen}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
          />
        );
      }
      return (
        <EuiSwitch
          checked={ensureBooleanType(value)}
          disabled={isLoading}
          label={
            tooltip ? (
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>
                  <p>{label}</p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="questionInCircle" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <p>{label}</p>
            )
          }
          onChange={(event) => {
            setConfigValue(event.target.checked);
          }}
        />
      );

    default:
      return sensitive ? (
        <EuiFieldPassword
          disabled={isLoading}
          required={required}
          type="dual"
          value={ensureStringType(value)}
          onChange={(event) => {
            setConfigValue(event.target.value);
          }}
        />
      ) : (
        <EuiFieldText
          disabled={isLoading}
          placeholder={placeholder}
          required={required}
          value={ensureStringType(value)}
          onChange={(event) => {
            setConfigValue(event.target.value);
          }}
        />
      );
  }
};
