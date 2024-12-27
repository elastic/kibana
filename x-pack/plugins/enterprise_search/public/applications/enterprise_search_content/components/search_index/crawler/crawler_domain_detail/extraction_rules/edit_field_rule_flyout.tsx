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
  EuiLink,
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
import { docLinks } from '../../../../../../shared/doc_links';

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
                validate: (rule) =>
                  !!rule?.trim() ||
                  i18n.translate(
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
                    data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleFieldName"
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
                validate: (rule) =>
                  !!rule?.trim() ||
                  i18n.translate(
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
                      data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleSource"
                      name="source_type_radiogroup"
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
                                  defaultMessage: 'CSS selector or XPath expression',
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
                              data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleSelector"
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
                      <EuiSpacer />
                      {field.value === FieldType.HTML ? (
                        <EuiLink
                          data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-learnMoreCSSSelectors"
                          href={`${docLinks.crawlerExtractionRules}#crawler-extraction-rules-css-selectors`}
                          external
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.contentField.cssSelectorsLink',
                            {
                              defaultMessage:
                                'Learn more about CSS selectors and XPath expressions',
                            }
                          )}
                        </EuiLink>
                      ) : (
                        <EuiLink
                          data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-learnMoreUrlPatterns"
                          href={`${docLinks.crawlerExtractionRules}#crawler-extraction-rules-url-patterns`}
                          external
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.contentField.urlPatternsLinks',
                            {
                              defaultMessage: 'Learn more about URL patterns',
                            }
                          )}
                        </EuiLink>
                      )}
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
                validate: (field) =>
                  !!field?.trim() ||
                  i18n.translate(
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
                        defaultMessage: 'Use content from',
                      }
                    )}
                    isInvalid={!!error && isTouched}
                    error={error as React.ReactNode}
                  >
                    <EuiRadioGroup
                      data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleExtraction"
                      name="content_from.value_type_radiogroup"
                      options={[
                        {
                          id: ContentFrom.EXTRACTED,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.extractedLabel',
                            {
                              defaultMessage: 'Extracted value',
                            }
                          ),
                        },
                        {
                          id: ContentFrom.FIXED,
                          label: i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.content.fixedLabel',
                            {
                              defaultMessage: 'A fixed value',
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
                              data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleMultipleObjects"
                              name="multiple_objects_handling_radiogroup"
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
                    field.value === ContentFrom.FIXED && (
                      <>
                        <EuiSpacer />
                        <Controller
                          control={control}
                          name="content_from.value"
                          render={({ field: valueField }) => (
                            <EuiFormRow
                              helpText={i18n.translate(
                                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.fixedValue.helpText',
                                {
                                  defaultMessage: 'Use a fixed value for this document field.',
                                }
                              )}
                              label={i18n.translate(
                                'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.fixedValue.label',
                                {
                                  defaultMessage: 'Fixed value',
                                }
                              )}
                            >
                              <EuiFieldText
                                data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-editContentRuleFixedValue"
                                fullWidth
                                placeholder={i18n.translate(
                                  'xpack.enterpriseSearch.content.indices.extractionRules.editContentField.fixedValue.placeHolder',
                                  {
                                    defaultMessage: 'e.g., "Some Value',
                                  }
                                )}
                                value={valueField.value ?? ''}
                                onChange={valueField.onChange}
                                inputRef={valueField.ref}
                                onBlur={valueField.onBlur}
                              />
                            </EuiFormRow>
                          )}
                        />
                      </>
                    )
                  )}
                </>
              )}
            />
            <EuiSpacer />
            <EuiLink
              data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-learnMoreDifferentContent"
              href={`${docLinks.crawlerExtractionRules}#crawler-extraction-rules-field-content`}
              external
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.contentField.differentContentLink',
                {
                  defaultMessage: 'Learn more about storing different kinds of content',
                }
              )}
            </EuiLink>
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
              data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-saveContentField"
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
