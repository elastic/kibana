/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';
import {
  EuiTextArea,
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
} from '@elastic/eui';
import { IntegrationConfigurationFormProps } from '@kbn/wci-browser';

export const IndexSourceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control } = form;
  const filterFieldsArray = useFieldArray({
    control,
    name: 'configuration.fields.filterFields',
  });

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
              <EuiFieldText
                data-test-subj="workchatAppIntegrationEditViewIndex"
                placeholder="Enter index name"
                {...field}
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
          filterFieldsArray.fields.map((field, index) => (
            <EuiPanel paddingSize="s" key={field.id} style={{ marginBottom: '8px' }}>
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
          contextFieldsArray.fields.map((field, index) => (
            <EuiPanel paddingSize="s" key={field.id} style={{ marginBottom: '8px' }}>
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

                <EuiFlexItem>
                  <EuiFormRow label="Description">
                    <Controller
                      name={`configuration.fields.contextFields.${index}.description`}
                      control={control}
                      render={({ field }) => (
                        <EuiFieldText placeholder="Field description" {...field} />
                      )}
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
