/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import type { SearchIndicesResponse } from '../../common/http_api/configuration';
import { useIndexNameAutocomplete } from '../hooks/use_index_name_autocomplete';

export const IndexSourceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control, setValue } = form;
  const filterFieldsArray = useFieldArray({
    control,
    name: 'configuration.fields.filterFields',
  });
  const [query, setQuery] = useState<{
    searchValue: string;
  }>();
  const [options, setOptions] = useState([] as string[]);
  
  let searchTimeout;

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
  const { isLoading, data } = useIndexNameAutocomplete();

  const [selectedOption, setSelected] = useState([]);

  const onChange = (selectedOption) => {
    setSelected(selectedOption);
  };

  const onSearchChange = (searchValue: string) => {
    console.log(`onSearchChange with ${searchValue}`);
    let result: string[] = [];
    setOptions(result);

    if (data) {
      data({ indexName: searchValue}).then(
        (indexNames: string[]) => {
          console.log("Got response");
          if (indexNames) { 
            console.log("Setting index names");
            console.log(indexNames);
            setOptions(indexNames);
          }
        }
      )
    }
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
        title={<h3>Index Source Configuration</h3>}
        description="Configure the index source details"
      >
        <EuiFormRow label="Index">
          <Controller
            name="configuration.index"
            control={control}
            render={({ field }) => (
              <EuiComboBox
                placeholder="Select an index"
                isLoading={isLoading}
                selectedOptions={selectedOption}
                singleSelection={{ asPlainText: true }}
                options={options.map((option) => ({ label: option, key: option }))}
                onChange={onChange}
                onSearchChange={onSearchChange}
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow label="Description">
          <Controller
            name="configuration.description"
            control={control}
            render={({ field }) => (
              <EuiTextArea
                data-test-subj="workchatAppIntegrationEditViewDescription"
                placeholder="Enter description"
                rows={3}
                {...field}
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow label="Query Template">
          <Controller
            name="configuration.queryTemplate"
            control={control}
            render={({ field }) => (
              <EuiTextArea
                data-test-subj="workchatAppIntegrationEditViewQueryTemplate"
                placeholder="Enter Elasticsearch query template"
                rows={6}
                {...field}
              />
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>Filter Fields</h3>}
        description="Fields that can be used for filtering documents"
      >
        {filterFieldsArray.fields.length === 0 ? (
          <EuiFormRow>
            <EuiCallOut title="No filter fields defined" color="primary">
              <p>Add filter fields to allow filtering on specific document fields</p>
            </EuiCallOut>
          </EuiFormRow>
        ) : (
          filterFieldsArray.fields.map((filterField, index) => (
            <EuiPanel paddingSize="s" key={filterField.id} style={{ marginBottom: '8px' }}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow label="Field name">
                    <Controller
                      name={`configuration.fields.filterFields.${index}.field`}
                      control={control}
                      render={({ field }) => <EuiFieldText placeholder="Field name" {...field} />}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFormRow label="Field type">
                    <Controller
                      name={`configuration.fields.filterFields.${index}.type`}
                      control={control}
                      render={({ field }) => <EuiSelect options={fieldTypeOptions} {...field} />}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Get values">
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

              <EuiFormRow label="Description">
                <Controller
                  name={`configuration.fields.filterFields.${index}.description`}
                  control={control}
                  render={({ field }) => (
                    <EuiFieldText placeholder="Field description" {...field} />
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
            Add filter field
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>Context Fields</h3>}
        description="Fields that provide additional context for the AI"
      >
        {contextFieldsArray.fields.length === 0 ? (
          <EuiFormRow>
            <EuiCallOut title="No context fields defined" color="primary">
              <p>Add context fields to provide additional information for the AI</p>
            </EuiCallOut>
          </EuiFormRow>
        ) : (
          contextFieldsArray.fields.map((contextField, index) => (
            <EuiPanel paddingSize="s" key={contextField.id} style={{ marginBottom: '8px' }}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow label="Field name">
                    <Controller
                      name={`configuration.fields.contextFields.${index}.field`}
                      control={control}
                      render={({ field }) => <EuiFieldText placeholder="Field name" {...field} />}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Semantic">
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
            Add context field
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
