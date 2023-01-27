/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  ExtractionFilter,
  ExtractionRule,
  ExtractionRuleBase,
} from '../../../../../../../../common/types/extraction_rules';

import { ContentFieldsPanel } from './content_fields_panel';
import { EditFieldRuleFlyout } from './edit_field_rule_flyout';
import { ExtractionRulesLogic } from './extraction_rules_logic';

interface EditExtractionRuleProps {
  cancelEditing: () => void;
  extractionRule: ExtractionRule | null;
  isNewRule: boolean;
  saveRule: (rule: ExtractionRuleBase) => void;
}

enum UrlState {
  ALL = 'all',
  SPECIFIC = 'specific',
}

const getReadableExtractionFilter = (rule: ExtractionFilter) => {
  switch (rule) {
    case ExtractionFilter.BEGINS:
      return i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRulesExtractionFilter.beginsWithLabel',
        {
          defaultMessage: 'Begins with',
        }
      );
    case ExtractionFilter.ENDS:
      return i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRulesExtractionFilter.endsWithLabel',
        {
          defaultMessage: 'Ends with',
        }
      );
    case ExtractionFilter.CONTAINS:
      return i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRulesExtractionFilter.containsLabel',
        {
          defaultMessage: 'Contains',
        }
      );
    case ExtractionFilter.REGEX:
      return i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRulesExtractionFilter.regexLabel',
        {
          defaultMessage: 'Regex',
        }
      );
  }
};

const extractionFilterOptions = [
  ExtractionFilter.BEGINS,
  ExtractionFilter.ENDS,
  ExtractionFilter.CONTAINS,
  ExtractionFilter.REGEX,
].map((ruleOption: ExtractionFilter) => ({
  text: getReadableExtractionFilter(ruleOption),
  value: ruleOption,
}));

export const EditExtractionRule: React.FC<EditExtractionRuleProps> = ({
  cancelEditing,
  extractionRule,
  isNewRule,
  saveRule,
}) => {
  const { closeEditRuleFlyout, openEditRuleFlyout } = useActions(ExtractionRulesLogic);
  const { fieldRuleFlyoutVisible, fieldRuleToEdit, fieldRuleToEditIndex, fieldRuleToEditIsNew } =
    useValues(ExtractionRulesLogic);
  const [urlToggle, setUrlToggle] = useState<UrlState>(UrlState.ALL);
  const { control, formState, getValues, handleSubmit, reset, setValue } =
    useForm<ExtractionRuleBase>({
      defaultValues: extractionRule ?? {
        description: '',
        rules: [],
        url_filters: [],
      },
      mode: 'all',
    });
  const {
    append: appendUrlFilter,
    fields: urlFiltersFields,
    remove: removeUrlFilter,
  } = useFieldArray({
    control,
    name: 'url_filters',
  });
  const {
    append: appendRule,
    fields: rulesFields,
    remove: removeRule,
    update: updateRule,
  } = useFieldArray({ control, name: 'rules' });

  useEffect(() => {
    reset(
      extractionRule ?? {
        description: '',
        rules: [],
        url_filters: [],
      }
    );
    if (extractionRule) {
      setUrlToggle(extractionRule.url_filters.length === 0 ? UrlState.ALL : UrlState.SPECIFIC);
    } else {
      setUrlToggle(UrlState.ALL);
    }
  }, [extractionRule]);

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {isNewRule
            ? i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.addRule.title',
                {
                  defaultMessage: 'Create a content extraction rule',
                }
              )
            : i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.title',
                {
                  defaultMessage: 'Edit content extraction rule',
                }
              )}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiForm onSubmit={handleSubmit(saveRule)}>
        <Controller
          control={control}
          name="description"
          rules={{
            required: i18n.translate(
              'xpack.enterpriseSearch.content.indices.extractionRules.editRule.descriptionError',
              {
                defaultMessage: 'A description is required for a content extraction rule',
              }
            ),
          }}
          render={({ field, fieldState }) => (
            <EuiFormRow
              error={fieldState.error}
              isInvalid={!!(fieldState.error && fieldState.isTouched)}
              helpText={i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.helpText',
                {
                  defaultMessage: 'Help others understand what data this rule will extract',
                }
              )}
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.descriptionLabel',
                {
                  defaultMessage: 'Rule description',
                }
              )}
            >
              <EuiFieldText
                isInvalid={!!(fieldState.error && fieldState.isTouched)}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={field.onChange}
                inputRef={field.ref}
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editRule.placeholderLabel',
                  {
                    defaultMessage: 'e.g. "Documentation Titles"',
                  }
                )}
              />
            </EuiFormRow>
          )}
        />
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.urlLabel',
            {
              defaultMessage: 'URL',
            }
          )}
        >
          <EuiRadioGroup
            options={[
              {
                id: UrlState.ALL,
                label: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.applyAllLabel',
                  {
                    defaultMessage: 'Apply to all URLs',
                  }
                ),
              },
              {
                id: UrlState.SPECIFIC,
                label: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.specificLabel',
                  {
                    defaultMessage: 'Apply to specific URLs',
                  }
                ),
              },
            ]}
            idSelected={urlToggle}
            onChange={(value) => {
              setUrlToggle(value as UrlState);
              // Make sure we always have one url filter when switching to specific URL filters
              if (value === UrlState.SPECIFIC && urlFiltersFields.length < 1) {
                setValue('url_filters', [{ filter: ExtractionFilter.BEGINS, pattern: '' }]);
              } else {
                setValue('url_filters', []);
              }
            }}
          />
        </EuiFormRow>
        <EuiSpacer />
        {urlToggle === UrlState.SPECIFIC && (
          <>
            {urlFiltersFields.map((urlFilter, index) => (
              <EuiFlexGroup alignItems="flexStart" key={urlFilter.id}>
                <EuiFlexItem>
                  <Controller
                    control={control}
                    name={`url_filters.${index}.filter`}
                    render={({ field }) => (
                      <EuiFormRow
                        helpText={i18n.translate(
                          'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilters.filterHelpText',
                          {
                            defaultMessage: 'What URLs should this apply to?',
                          }
                        )}
                        label={i18n.translate(
                          'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilters.filterLabel',
                          {
                            defaultMessage: 'URL filter',
                          }
                        )}
                      >
                        <EuiSelect
                          data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-urlFilter"
                          fullWidth
                          inputRef={field.ref}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          options={extractionFilterOptions}
                        />
                      </EuiFormRow>
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <Controller
                    control={control}
                    name={`url_filters.${index}.pattern`}
                    render={({ field }) => (
                      <>
                        <EuiFormRow
                          label={i18n.translate(
                            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilter.',
                            {
                              defaultMessage: 'URL pattern',
                            }
                          )}
                        >
                          <EuiFieldText
                            data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-urlPattern"
                            fullWidth
                            placeholder={i18n.translate(
                              'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilters.patternPlaceholder',
                              {
                                defaultMessage: 'e.g. "/blog/*"',
                              }
                            )}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            inputRef={field.ref}
                          />
                        </EuiFormRow>
                        <EuiSpacer />
                      </>
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem style={{ alignSelf: 'center' }}>
                  {urlFiltersFields.length > 1 && (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilters.removeFilter',
                        {
                          defaultMessage: 'Remove this filter',
                        }
                      )}
                      iconType="trash"
                      color="danger"
                      onClick={() => removeUrlFilter(index)}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
            <EuiSpacer />
            <EuiButton
              iconType="plusInCircle"
              onClick={() => appendUrlFilter({ filter: ExtractionFilter.BEGINS, pattern: '' })}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFilters.addFilter',
                {
                  defaultMessage: 'Add URL filter',
                }
              )}
            </EuiButton>
          </>
        )}
        <EuiSpacer />
        <EuiLink href="TODO" external>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.url.urlFiltersLink',
            {
              defaultMessage: 'Learn more about URL filters',
            }
          )}
        </EuiLink>
        <EuiSpacer />
        <EuiPanel color="subdued">
          <ContentFieldsPanel
            contentFields={rulesFields}
            editExistingField={(id) =>
              openEditRuleFlyout({
                fieldRule: rulesFields.find(({ id: ruleId }) => ruleId === id),
                isNewRule: false,
              })
            }
            editNewField={() => openEditRuleFlyout({ isNewRule: true })}
            removeField={(id) => {
              const index = rulesFields.findIndex(({ id: ruleId }) => ruleId === id);
              if (index >= 0) {
                removeRule(index);
              }
            }}
          />
        </EuiPanel>
        <EuiSpacer />
        <EuiFormRow>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={cancelEditing}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editRule.cancelButtonLabel',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                onClick={() => saveRule({ ...getValues() })}
                disabled={!formState.isValid}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.extractionRules.editRule.saveButtonLabel',
                  {
                    defaultMessage: 'Save rule',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
      {fieldRuleFlyoutVisible && (
        <EditFieldRuleFlyout
          fieldRule={fieldRuleToEdit}
          isNewRule={fieldRuleToEditIsNew}
          onClose={closeEditRuleFlyout}
          // omit id and index so we don't break the API when submitting
          saveRule={({ id, index, ...fieldRule }) => {
            if (fieldRuleToEditIsNew) {
              appendRule(fieldRule);
            } else {
              updateRule(fieldRuleToEditIndex ?? 0, fieldRule);
            }
            closeEditRuleFlyout();
          }}
        />
      )}
    </>
  );
};
