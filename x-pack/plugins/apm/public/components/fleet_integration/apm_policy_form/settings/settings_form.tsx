/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
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
import { PackagePolicyVars } from '../typings';
import { FormRowField } from './form_row_field';

interface AdvancedOptionsField {
  type: 'advanced_option';
  fields: Field[];
}

export interface Settings {
  title: string;
  subtitle: string;
  requiredErrorMessage?: string;
  fields: SettingsField[];
}

export interface Field {
  type: 'text' | 'bool' | 'select' | 'area' | 'integer';
  key: string;
  title?: string;
  description?: string;
  label?: string;
  helpText?: string;
  required: boolean;
  fields?: SettingsField[];
  prependIcon?: string;
  validation?: t.Type<any, string, unknown>;
}

type SettingsField = Field | AdvancedOptionsField;

export type FormRowOnChange = (key: string, value: any) => void;

interface Props {
  settings: Settings;
  vars?: PackagePolicyVars;
  onChange: FormRowOnChange;
}

function FormRow({
  field,
  vars,
  onChange,
  requiredErrorMessage,
}: {
  field: SettingsField;
  vars?: PackagePolicyVars;
  onChange: FormRowOnChange;
  requiredErrorMessage?: string;
}) {
  if (field.type === 'advanced_option') {
    return (
      <AdvancedOptions>
        {field.fields.map((advancedField) =>
          FormRow({
            field: advancedField,
            vars,
            onChange,
            requiredErrorMessage,
          })
        )}
      </AdvancedOptions>
    );
  } else {
    const value = vars?.[field.key]?.value;
    const isInvalid = field.required && !value;
    return (
      <React.Fragment key={field.key}>
        <EuiDescribedFormGroup
          title={<h3>{field.title}</h3>}
          description={field.description}
        >
          <EuiFormRow
            label={field.label}
            isInvalid={isInvalid}
            error={isInvalid ? requiredErrorMessage : undefined}
            helpText={<EuiText size="xs">{field.helpText}</EuiText>}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {field.required ? 'Required' : 'Optional'}
              </EuiText>
            }
          >
            <FormRowField field={field} onChange={onChange} value={value} />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        {field.fields &&
          value &&
          field.fields.map((childField) =>
            FormRow({
              field: childField,
              vars,
              onChange,
              requiredErrorMessage,
            })
          )}
      </React.Fragment>
    );
  }
}

export function SettingsForm({ settings, vars, onChange }: Props) {
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
          vars,
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
