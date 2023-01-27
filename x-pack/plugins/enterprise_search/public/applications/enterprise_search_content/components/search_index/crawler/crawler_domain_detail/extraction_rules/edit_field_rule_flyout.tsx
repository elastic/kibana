/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { Controller, useForm } from 'react-hook-form';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ContentFrom,
  ExtractionRuleFieldRule,
  FieldType,
  MultipleObjectsHandling,
} from '../../../../../../../../common/types/extraction_rules';

interface EditFieldRuleFlyoutProps {
  fieldRule: ExtractionRuleFieldRule | null;
  isNewRule: boolean;
  onClose: () => void;
  saveRule: (fieldRule: ExtractionRuleFieldRule & { id?: string; index?: number }) => void;
}

const defaultRule = {
  content_from: {
    value: '',
    value_type: undefined,
  },
  field_name: '',
  multiple_objects_handling: MultipleObjectsHandling.STRING,
  selector: '',
  source_type: undefined,
};

export const EditFieldRuleFlyout: React.FC<EditFieldRuleFlyoutProps> = ({
  onClose,
  fieldRule,
  isNewRule,
  saveRule,
}) => {
  const { control, reset, getValues, formState } = useForm<ExtractionRuleFieldRule>({
    defaultValues: fieldRule ?? defaultRule,
    mode: 'all',
  });

  useEffect(() => {
    reset(fieldRule ?? defaultRule);
  }, [fieldRule]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isNewRule
              ? i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.addContentField.title',
                  {
                    defaultMessage: 'Add content field rule',
                  }
                )
              : i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.title',
                  {
                    defaultMessage: 'Edit content field rule',
                  }
                )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiPanel paddingSize="l" color="subdued" hasShadow={false}>
            <EuiTitle size="s">
              <h4>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.documentField.title',
                  {
                    defaultMessage: 'Document field',
                  }
                )}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.documentField.description',
                {
                  defaultMessage: 'Select a document field to build a rule around.',
                }
              )}
            </EuiText>
            <EuiSpacer />
            <Controller
              control={control}
              name="field_name"
              rules={{
                required: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.edilidtContentField.documentField.requiredError',
                  {
                    defaultMessage: 'A field name is required.',
                  }
                ),
              }}
              render={({ field, fieldState: { error, isTouched } }) => (
                <EuiFormRow
                  error={error?.message}
                  isInvalid={!!error && isTouched}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.documentField.label',
                    {
                      defaultMessage: 'Field name',
                    }
                  )}
                >
                  <EuiFieldText
                    isInvalid={!!error && isTouched}
                    fullWidth
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    inputRef={field.ref}
                  />
                </EuiFormRow>
              )}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l" color="subdued" hasShadow={false}>
            <EuiTitle size="s">
              <h4>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.title',
                  {
                    defaultMessage: 'Source',
                  }
                )}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.description',
                {
                  defaultMessage: 'Where to extract the content for this field from.',
                }
              )}
            </EuiText>
            <EuiSpacer />
            <Controller
              control={control}
              name="source_type"
              rules={{
                required: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.requiredError',
                  {
                    defaultMessage: 'A source for the content is required.',
                  }
                ),
              }}
              render={({ field }) => (
                <>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.label',
                      {
                        defaultMessage: 'Extract content from',
                      }
                    )}
                  >
                    <EuiRadioGroup
                      options={[
                        {
                          id: FieldType.HTML,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.htmlLabel',
                            {
                              defaultMessage: 'HTML element',
                            }
                          ),
                        },
                        {
                          id: FieldType.URL,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.source.urlLabel',
                            {
                              defaultMessage: 'URL',
                            }
                          ),
                        },
                      ]}
                      idSelected={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </EuiFormRow>
                  {!!field.value && (
                    <>
                      <EuiSpacer />
                      <EuiFormRow
                        fullWidth
                        label={
                          field.value === FieldType.HTML
                            ? i18n.translate(
                                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.htmlLabel',
                                {
                                  defaultMessage: 'CSS selector',
                                }
                              )
                            : i18n.translate(
                                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.urlLabel',
                                {
                                  defaultMessage: 'URL pattern',
                                }
                              )
                        }
                      >
                        <Controller
                          control={control}
                          name="selector"
                          render={({ field: selectorField, fieldState: { error, isTouched } }) => (
                            <EuiFieldText
                              isInvalid={!!error && isTouched}
                              fullWidth
                              placeholder={
                                field.value === FieldType.HTML
                                  ? i18n.translate(
                                      'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.selector.cssPlaceholder',
                                      {
                                        defaultMessage: 'e.g. ".main_content"',
                                      }
                                    )
                                  : i18n.translate(
                                      'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.selector.urlLabel',
                                      {
                                        defaultMessage: `e.g. \/my-url\/(.*\/`,
                                      }
                                    )
                              }
                              inputRef={selectorField.ref}
                              onBlur={selectorField.onBlur}
                              onChange={selectorField.onChange}
                              value={selectorField.value ?? ''}
                            />
                          )}
                        />
                      </EuiFormRow>
                    </>
                  )}
                </>
              )}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel paddingSize="l" color="subdued" hasShadow={false}>
            <EuiTitle size="s">
              <h4>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.title',
                  {
                    defaultMessage: 'Content',
                  }
                )}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.description',
                {
                  defaultMessage: 'Populate the field with content.',
                }
              )}
            </EuiText>

            <EuiSpacer />
            <Controller
              control={control}
              name="content_from.value_type"
              rules={{
                required: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.requiredError',
                  {
                    defaultMessage: 'A value for this content field is required',
                  }
                ),
              }}
              render={({ field, fieldState: { error, isTouched } }) => (
                <>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.label',
                      {
                        defaultMessage: 'Extract content from',
                      }
                    )}
                    isInvalid={!!error && isTouched}
                    error={error}
                  >
                    <EuiRadioGroup
                      options={[
                        {
                          id: ContentFrom.EXTRACTED,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.extractedLabel',
                            {
                              defaultMessage: 'Extracted',
                            }
                          ),
                        },
                        {
                          id: ContentFrom.FIXED,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.fixedLabel',
                            {
                              defaultMessage: 'Fixed',
                            }
                          ),
                        },
                      ]}
                      idSelected={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </EuiFormRow>
                  {field.value === ContentFrom.EXTRACTED ? (
                    <Controller
                      control={control}
                      name="multiple_objects_handling"
                      rules={{ required: true }}
                      render={({
                        field: multipleObjectsField,
                        fieldState: { error: multipleError, isTouched: multipleIsTouched },
                      }) => (
                        <>
                          <EuiSpacer />
                          <EuiFormRow
                            isInvalid={!!multipleError && multipleIsTouched}
                            label={i18n.translate(
                              'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.extractAs.label',
                              {
                                defaultMessage: 'Store extracted content as',
                              }
                            )}
                          >
                            <EuiRadioGroup
                              options={[
                                {
                                  id: MultipleObjectsHandling.STRING,
                                  label: i18n.translate(
                                    'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.extractAs.stringLabel',
                                    {
                                      defaultMessage: 'A string',
                                    }
                                  ),
                                },
                                {
                                  id: MultipleObjectsHandling.ARRAY,
                                  label: i18n.translate(
                                    'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.extractAs.arrayLabel',
                                    {
                                      defaultMessage: 'An array',
                                    }
                                  ),
                                },
                              ]}
                              idSelected={multipleObjectsField.value}
                              onChange={multipleObjectsField.onChange}
                              onBlur={multipleObjectsField.onBlur}
                            />
                          </EuiFormRow>
                        </>
                      )}
                    />
                  ) : (
                    <>
                      <EuiSpacer />
                      <Controller
                        control={control}
                        name="content_from.value"
                        render={({ field: valueField }) => (
                          <EuiFormRow
                            label={i18n.translate(
                              'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.fixedValue.label',
                              {
                                defaultMessage: 'Fixed value',
                              }
                            )}
                          >
                            <EuiFieldText
                              fullWidth
                              value={valueField.value ?? ''}
                              onChange={valueField.onChange}
                              inputRef={valueField.ref}
                              onBlur={valueField.onBlur}
                            />
                          </EuiFormRow>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            />
          </EuiPanel>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.cancelButton.label',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!formState.isValid}
              onClick={() => {
                saveRule({ ...getValues() });
              }}
              fill
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.saveButton.label',
                {
                  defaultMessage: 'Save',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
