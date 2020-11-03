/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { PainlessLang } from '@kbn/monaco';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
} from '@elastic/eui';

import { useForm, Form, FormHook, UseField, TextField, CodeEditor } from '../../shared_imports';
import { RuntimeField } from '../../types';
import { RUNTIME_FIELD_OPTIONS } from '../../constants';
import { schema } from './schema';

export interface FormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<RuntimeField>['submit'];
}

export interface Props {
  links: {
    painlessSyntax: string;
  };
  defaultValue?: RuntimeField;
  onChange?: (state: FormState) => void;
}

const RuntimeFieldFormComp = ({ defaultValue, onChange, links }: Props) => {
  const { form } = useForm<RuntimeField>({ defaultValue, schema });
  const { submit, isValid: isFormValid, isSubmitted } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, submit });
    }
  }, [onChange, isFormValid, isSubmitted, submit]);

  return (
    <Form form={form} className="runtimeFieldEditor_form">
      <EuiFlexGroup>
        {/* Name */}
        <EuiFlexItem>
          <UseField path="name" component={TextField} data-test-subj="nameField" />
        </EuiFlexItem>

        {/* Return type */}
        <EuiFlexItem>
          <UseField<EuiComboBoxOptionOption[]> path="type">
            {({ label, value, setValue }) => {
              if (value === undefined) {
                return null;
              }
              return (
                <>
                  <EuiFormRow label={label} fullWidth>
                    <EuiComboBox
                      placeholder={i18n.translate(
                        'xpack.runtimeFields.form.runtimeType.placeholderLabel',
                        {
                          defaultMessage: 'Select a type',
                        }
                      )}
                      singleSelection={{ asPlainText: true }}
                      options={RUNTIME_FIELD_OPTIONS}
                      selectedOptions={value}
                      onChange={(newValue) => {
                        if (newValue.length === 0) {
                          // Don't allow clearing the type. One must always be selected
                          return;
                        }
                        setValue(newValue);
                      }}
                      isClearable={false}
                      data-test-subj="typeField"
                      fullWidth
                    />
                  </EuiFormRow>
                </>
              );
            }}
          </UseField>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Script */}
      <UseField<string> path="script">
        {({ value, setValue, label, isValid, getErrorsMessages }) => {
          return (
            <EuiFormRow
              label={label}
              error={getErrorsMessages()}
              isInvalid={!isValid}
              helpText={
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      href={links.painlessSyntax}
                      target="_blank"
                      external
                      data-test-subj="painlessSyntaxLearnMoreLink"
                    >
                      {i18n.translate('xpack.runtimeFields.form.script.learnMoreLinkText', {
                        defaultMessage: 'Learn more about syntax.',
                      })}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              fullWidth
            >
              <CodeEditor
                languageId={PainlessLang.ID}
                width="100%"
                height="300px"
                value={value}
                onChange={setValue}
                options={{
                  fontSize: 12,
                  minimap: {
                    enabled: false,
                  },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  automaticLayout: true,
                }}
                data-test-subj="scriptField"
              />
            </EuiFormRow>
          );
        }}
      </UseField>
    </Form>
  );
};

export const RuntimeFieldForm = React.memo(RuntimeFieldFormComp);
