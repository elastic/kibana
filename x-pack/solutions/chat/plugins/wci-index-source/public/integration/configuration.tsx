/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useFieldArray, Controller } from 'react-hook-form';
import {
  EuiTextArea,
  EuiComboBox,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiSelect,
  EuiSwitch,
  EuiButton,
  EuiButtonIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { IndexSourceDefinition } from '@kbn/wci-common';
import { IntegrationConfigurationFormProps } from '@kbn/wci-browser';
import type { WCIIndexSourceFilterField, WCIIndexSourceContextField } from '../../common/types';
import { useGenerateSchema } from '../hooks/use_generate_schema';
import { useIndexNameAutocomplete } from '../hooks/use_index_name_autocomplete';
import { translations } from './i18n';

export const IndexSourceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control, setValue } = form;
  const filterFieldsArray = useFieldArray({
    control,
    name: 'configuration.fields.filterFields',
  });
  const [query, setQuery] = useState('');

  const contextFieldsArray = useFieldArray({
    control,
    name: 'configuration.fields.contextFields',
  });

  const fieldTypeOptions = [
    { value: 'keyword', text: 'Keyword' },
    { value: 'text', text: 'Text' },
    { value: 'date', text: 'Date' },
    { value: 'number', text: 'Number' },
    { value: 'boolean', text: 'Boolean' },
  ];

  const { generateSchema } = useGenerateSchema();
  const { isLoading, data } = useIndexNameAutocomplete({ query });

  const onSearchChange = (searchValue: string) => {
    setQuery(searchValue);
  };

  const onSchemaGenerated = useCallback(
    (definition: IndexSourceDefinition) => {
      setValue('configuration.description', definition.description);
      setValue(
        'configuration.fields.filterFields',
        definition.filterFields.map<WCIIndexSourceFilterField>((field) => {
          return {
            field: field.field,
            type: field.type,
            description: field.description,
            getValues: field.asEnum,
          };
        })
      );

      const queryClauses = definition.queryFields.map((field) => {
        if (field.type === 'semantic_text') {
          return {
            semantic: {
              field: field.field,
              query: '{query}',
            },
          };
        } else {
          return {
            match: {
              [field.field]: '{query}',
            },
          };
        }
      });
      const queryTemplate = {
        bool: {
          should: queryClauses,
        },
      };

      setValue('configuration.queryTemplate', JSON.stringify(queryTemplate, undefined, 2));

      setValue(
        'configuration.fields.contextFields',
        definition.contentFields.map<WCIIndexSourceContextField>((field) => {
          return {
            field: field.field,
            description: '',
            type: field.type === 'semantic_text' ? 'semantic' : undefined,
          };
        })
      );
    },
    [setValue]
  );

  return (
    <>
      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>{translations.indexSourceConfiguration.title}</h3>}
        description={translations.indexSourceConfiguration.description}
      >
        <EuiFormRow label={translations.indexSourceConfiguration.index.label}>
          <Controller
            name="configuration.index"
            control={control}
            render={({ field }) => (
              <EuiComboBox
                data-test-subj="workchatAppIntegrationEditViewIndex"
                placeholder={translations.indexSourceConfiguration.index.placeholder}
                {...field}
                isLoading={isLoading}
                selectedOptions={
                  field.value ? [{ label: field.value, key: field.value }] : undefined
                }
                singleSelection={{ asPlainText: true }}
                options={data.map((option) => ({ label: option, key: option }))}
                onChange={(selected) => {
                  const index = selected.length > 0 ? selected[0].key : '';
                  field.onChange(index);
                }}
                fullWidth={true}
                onSearchChange={onSearchChange}
                append={
                  <EuiButtonEmpty
                    size="xs"
                    iconType="gear"
                    onClick={() => {
                      if (!field.value) return;

                      generateSchema({ indexName: field.value }, { onSuccess: onSchemaGenerated });
                    }}
                  >
                    {translations.indexSourceConfiguration.index.generateConfig}
                  </EuiButtonEmpty>
                }
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow label={translations.indexSourceConfiguration.toolDescription.label}>
          <Controller
            name="configuration.description"
            control={control}
            render={({ field }) => (
              <EuiTextArea
                data-test-subj="workchatAppIntegrationEditViewDescription"
                placeholder={translations.indexSourceConfiguration.toolDescription.placeholder}
                rows={3}
                {...field}
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow label={translations.indexSourceConfiguration.queryTemplate.label}>
          <Controller
            name="configuration.queryTemplate"
            control={control}
            render={({ field }) => (
              <EuiTextArea
                data-test-subj="workchatAppIntegrationEditViewQueryTemplate"
                placeholder={translations.indexSourceConfiguration.queryTemplate.placeholder}
                rows={6}
                {...field}
              />
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>{translations.indexSourceConfiguration.filterFields.title}</h3>}
        description={translations.indexSourceConfiguration.filterFields.description}
      >
        {filterFieldsArray.fields.length === 0 ? (
          <EuiFormRow>
            <EuiCallOut
              title={translations.indexSourceConfiguration.filterFields.noFields.title}
              color="primary"
            >
              <p>{translations.indexSourceConfiguration.filterFields.noFields.description}</p>
            </EuiCallOut>
          </EuiFormRow>
        ) : (
          filterFieldsArray.fields.map((filterField, index) => (
            <EuiPanel paddingSize="s" key={filterField.id} css={{ marginBottom: '8px' }}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow label={translations.indexSourceConfiguration.filterFields.fieldName}>
                    <Controller
                      name={`configuration.fields.filterFields.${index}.field`}
                      control={control}
                      render={({ field }) => (
                        <EuiFieldText
                          placeholder={translations.indexSourceConfiguration.filterFields.fieldName}
                          {...field}
                        />
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFormRow
                    label={translations.indexSourceConfiguration.filterFields.fieldType.label}
                  >
                    <Controller
                      name={`configuration.fields.filterFields.${index}.type`}
                      control={control}
                      render={({ field }) => <EuiSelect options={fieldTypeOptions} {...field} />}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={translations.indexSourceConfiguration.filterFields.getValues.label}
                  >
                    <Controller
                      name={`configuration.fields.filterFields.${index}.getValues`}
                      control={control}
                      render={({ field: { onChange, value, ...rest } }) => (
                        <EuiSwitch
                          label=""
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          {...rest}
                        />
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label="Remove field"
                      onClick={() => filterFieldsArray.remove(index)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiFormRow
                label={translations.indexSourceConfiguration.filterFields.fieldDescription.label}
              >
                <Controller
                  name={`configuration.fields.filterFields.${index}.description`}
                  control={control}
                  render={({ field }) => (
                    <EuiFieldText
                      placeholder={
                        translations.indexSourceConfiguration.filterFields.fieldDescription
                          .placeholder
                      }
                      {...field}
                    />
                  )}
                />
              </EuiFormRow>
            </EuiPanel>
          ))
        )}

        <EuiFormRow>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={() =>
              filterFieldsArray.append({
                field: '',
                type: 'keyword',
                getValues: true,
                description: '',
              })
            }
          >
            {translations.indexSourceConfiguration.filterFields.addField}
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>{translations.indexSourceConfiguration.contextFields.title}</h3>}
        description={translations.indexSourceConfiguration.contextFields.description}
      >
        {contextFieldsArray.fields.length === 0 ? (
          <EuiFormRow>
            <EuiCallOut
              title={translations.indexSourceConfiguration.contextFields.noFields.title}
              color="primary"
            >
              <p>{translations.indexSourceConfiguration.contextFields.noFields.description}</p>
            </EuiCallOut>
          </EuiFormRow>
        ) : (
          contextFieldsArray.fields.map((contextField, index) => (
            <EuiPanel paddingSize="s" key={contextField.id} css={{ marginBottom: '8px' }}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow label={translations.indexSourceConfiguration.contextFields.fieldName}>
                    <Controller
                      name={`configuration.fields.contextFields.${index}.field`}
                      control={control}
                      render={({ field }) => (
                        <EuiFieldText
                          placeholder={
                            translations.indexSourceConfiguration.contextFields.fieldName
                          }
                          {...field}
                        />
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={translations.indexSourceConfiguration.contextFields.semantic.label}
                  >
                    <Controller
                      name={`configuration.fields.contextFields.${index}.type`}
                      control={control}
                      render={({ field: { onChange, value, ...rest } }) => (
                        <EuiSwitch
                          label=""
                          checked={value === 'semantic'}
                          onChange={(e) => onChange(e.target.checked ? 'semantic' : undefined)}
                          {...rest}
                        />
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label="Remove field"
                      onClick={() => contextFieldsArray.remove(index)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ))
        )}

        <EuiFormRow>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={() => contextFieldsArray.append({ field: '', description: '' })}
          >
            {translations.indexSourceConfiguration.contextFields.addField}
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
