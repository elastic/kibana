/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { PackagePolicyValues } from '../';

interface AdvancedOptionsField {
  type: 'advanced_option';
  fields: Field[];
}

export interface Settings {
  title: string;
  subtitle: string;
  requiredErrorMessage?: string;
  fields: Field[];
}

type Field =
  | {
      key: string;
      title?: string;
      description?: string;
      label?: string;
      helpText?: string;
      type: 'text' | 'bool' | 'select' | 'area';
      required: boolean;
      defaultValue?: any;
      fields?: Field[];
      prependIcon?: string;
    }
  | AdvancedOptionsField;

export type FormRowOnChange = (key: string, value: any) => void;

interface Props {
  settings: Settings;
  values?: PackagePolicyValues;
  onChange: FormRowOnChange;
}

function FormRow({
  field,
  values,
  onChange,
  requiredErrorMessage,
}: {
  field: Field;
  values?: PackagePolicyValues;
  onChange: FormRowOnChange;
  requiredErrorMessage?: string;
}) {
  if (field.type === 'advanced_option') {
    return (
      <AdvancedOptions>
        {field.fields.map((advancedField) =>
          FormRow({
            field: advancedField,
            values,
            onChange,
            requiredErrorMessage,
          })
        )}
      </AdvancedOptions>
    );
  } else {
    const fieldValue = values?.[field.key]?.value;
    const isInvalid = field.required && !fieldValue;
    return (
      <React.Fragment key={field.key}>
        <EuiDescribedFormGroup
          title={<h3>{field.title}</h3>}
          description={field.description}
        >
          {field.type === 'bool' && (
            <EuiFormRow
              helpText={
                <EuiText size="xs" color="subdued">
                  {field.helpText}
                </EuiText>
              }
            >
              <EuiSwitch
                label={field.label || (fieldValue ? 'Enabled' : 'Disabled')}
                checked={fieldValue || field.defaultValue}
                onChange={(e) => {
                  onChange(field.key, e.target.checked);
                }}
              />
            </EuiFormRow>
          )}
          {field.type === 'text' && (
            <EuiFormRow
              label={field.label}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {field.required ? 'Required' : 'Optional'}
                </EuiText>
              }
              helpText={
                <EuiText size="xs" color={isInvalid ? 'danger' : 'subdued'}>
                  {isInvalid ? requiredErrorMessage : field.helpText}
                </EuiText>
              }
            >
              <EuiFieldText
                isInvalid={isInvalid}
                value={fieldValue || field.defaultValue}
                onChange={(e) => {
                  onChange(field.key, e.target.value);
                }}
              />
            </EuiFormRow>
          )}

          {field.type === 'area' && (
            <EuiFormRow
              label={field.label}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {field.required ? 'Required' : 'Optional'}
                </EuiText>
              }
              helpText={
                <EuiText size="xs" color={isInvalid ? 'danger' : 'subdued'}>
                  {isInvalid ? requiredErrorMessage : field.helpText}
                </EuiText>
              }
            >
              <EuiTextArea
                isInvalid={isInvalid}
                value={fieldValue || field.defaultValue}
                onChange={(e) => {
                  onChange(field.key, e.target.value);
                }}
              />
            </EuiFormRow>
          )}
        </EuiDescribedFormGroup>
        {field.fields &&
          fieldValue &&
          field.fields.map((childField) =>
            FormRow({
              field: childField,
              values,
              onChange,
              requiredErrorMessage,
            })
          )}
      </React.Fragment>
    );
  }
}

export function SettingsForm({ settings, values, onChange }: Props) {
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{settings.title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {settings.subtitle}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />

      {settings.fields.map((field) => {
        return FormRow({
          field,
          values,
          onChange,
          requiredErrorMessage: settings.requiredErrorMessage,
        });
      })}
    </EuiPanel>
  );
}

function AdvancedOptions({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem />
        <EuiFlexItem>
          <EuiLink
            onClick={() => {
              setIsOpen((state) => !state);
            }}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={isOpen ? 'arrowDown' : 'arrowRight'} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>Advanced options</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpen && (
        <>
          <EuiHorizontalRule />
          {children}
        </>
      )}
    </>
  );
}
