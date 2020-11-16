/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCodeEditor,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiCodeBlock,
} from '@elastic/eui';

import {
  useForm,
  Form,
  UseField,
  TextField,
  ToggleField,
  FormSchema,
  FormDataProvider,
} from '../../shared_imports';

interface GrokConfig {
  pattern: string;
  field: string;
  grokName?: string;
  customPattern?: string;
}

interface GrokConfigInternal extends GrokConfig {
  withCustomPattern: boolean;
}

const deserializer = (input: GrokConfig): GrokConfigInternal => {
  return {
    ...input,
    withCustomPattern: input.hasOwnProperty('customPattern'),
  };
};

const serializer = (input: GrokConfigInternal): GrokConfig => {
  const { withCustomPattern, ...rest } = input;
  return rest;
};

const schema: FormSchema<GrokConfigInternal> = {
  pattern: {
    label: 'Grok pattern',
  },
  grokName: {
    label: 'Name',
  },
  customPattern: {
    label: 'Custom pattern',
  },
  withCustomPattern: {
    defaultValue: false,
  },
};

const sampleCustomPatterns = `POSTFIX_QUEUEID [0-9A-F]{10,11}
MSG message-id=<%{GREEDYDATA}>`;

export const GrokEditor = () => {
  const { form } = useForm({ schema, deserializer, serializer });

  return (
    <div className="application">
      <Form form={form}>
        <UseField<string> path="pattern">
          {({ value, setValue }) => {
            return (
              <EuiFormRow label="Grok pattern" fullWidth>
                <EuiCodeEditor
                  width="100%"
                  theme="textmate"
                  value={value}
                  onChange={setValue}
                  setOptions={{
                    highlightActiveLine: false,
                    highlightGutterLine: false,
                    minLines: 3,
                    maxLines: 10,
                  }}
                />
              </EuiFormRow>
            );
          }}
        </UseField>

        <EuiSpacer />

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <UseField<string>
              path="doCreateGroup"
              component={ToggleField}
              componentProps={{
                euiFieldProps: {
                  showLabel: false,
                },
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <div>
              <EuiTitle size="xs">
                <h3>Group fields</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                Give a name to the extracted fields to group them under the same object
              </EuiText>

              <FormDataProvider pathsToWatch="doCreateGroup">
                {({ doCreateGroup }) => {
                  return doCreateGroup === true ? (
                    <>
                      <EuiSpacer size="m" />
                      <UseField<string> path="grokName" component={TextField} />
                    </>
                  ) : null;
                }}
              </FormDataProvider>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <UseField<boolean>
              path="withCustomPattern"
              component={ToggleField}
              componentProps={{
                euiFieldProps: {
                  showLabel: false,
                },
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <div>
              <EuiTitle size="xs">
                <h3>Custom pattern</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                Define custom pattern declared in the grok
              </EuiText>

              <FormDataProvider pathsToWatch="withCustomPattern">
                {({ withCustomPattern }) => {
                  return withCustomPattern === true ? (
                    <>
                      <EuiSpacer size="m" />
                      <EuiCallOut title="Enter one custom pattern per line. For example:">
                        <EuiCodeBlock>{sampleCustomPatterns}</EuiCodeBlock>
                      </EuiCallOut>

                      <EuiSpacer size="m" />

                      <UseField<string> path="customPattern">
                        {({ value, setValue, label }) => {
                          return (
                            <EuiFormRow label={label} fullWidth>
                              <EuiCodeEditor
                                width="100%"
                                theme="textmate"
                                mode="text"
                                value={value}
                                onChange={setValue}
                                setOptions={{
                                  highlightActiveLine: false,
                                  highlightGutterLine: false,
                                  minLines: 3,
                                  maxLines: 10,
                                }}
                              />
                            </EuiFormRow>
                          );
                        }}
                      </UseField>
                    </>
                  ) : null;
                }}
              </FormDataProvider>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Form>
    </div>
  );
};
