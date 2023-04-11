/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FieldMapping } from '../../../../../../../common/ml_inference_pipeline';

import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';

type FieldNames = Array<{ label: string }>;

export const MultiFieldMapping: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration, selectedSourceFields = [] },
    sourceFields,
  } = useValues(MLInferenceLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { addSelectedFieldsToMapping, selectFields } = useActions(MLInferenceLogic);

  const mappedSourceFields =
    configuration.fieldMappings?.map(({ sourceField }) => sourceField) ?? [];

  // Remove fields that have already been selected or mapped from selectable field options
  const fieldOptions = (sourceFields || [])
    .filter((fieldName) => ![...selectedSourceFields, ...mappedSourceFields].includes(fieldName))
    .map((fieldName) => ({ label: fieldName }));

  const selectedFields = selectedSourceFields.map((fieldName) => ({
    label: fieldName,
  }));

  const onChangeSelectedFields = (selectedFieldNames: FieldNames) => {
    selectFields(selectedFieldNames.map(({ label }) => label));
  };

  const onCreateField = (fieldName: string) => {
    const normalizedFieldName = fieldName.trim();
    if (!normalizedFieldName) return;

    selectedFields.push({ label: normalizedFieldName });
    selectFields([...selectedSourceFields, fieldName]);
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={4}>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceFieldLabel',
              {
                defaultMessage: 'Source field',
              }
            )}
            helpText={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.sourceField.helpText',
              {
                defaultMessage: 'Select an existing field or type in a field name.',
              }
            )}
          >
            <EuiComboBox
              fullWidth
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureFields-selectSchemaField`}
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.selectedFields',
                {
                  defaultMessage: 'Selected fields',
                }
              )}
              options={fieldOptions}
              selectedOptions={selectedFields}
              onChange={onChangeSelectedFields}
              onCreateOption={onCreateField}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ paddingTop: '32px' }}>
          <EuiIcon type="sortRight" />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.targetFieldLabel',
              {
                defaultMessage: 'Target field',
              }
            )}
            helpText={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.targetField.helpText',
              {
                defaultMessage: 'This name is automatically created based on your source field.',
              }
            )}
            fullWidth
          >
            <EuiFieldText
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureFields-targetField`}
              disabled
              value={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.targetField.defaultValue',
                {
                  defaultMessage: 'This is automatically created',
                }
              )}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ paddingTop: '20px' }}>
          <EuiButton
            color="primary"
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureFields-addSelectedFieldsToMapping`}
            disabled={selectedFields.length === 0}
            iconType="plusInCircle"
            onClick={addSelectedFieldsToMapping}
            style={{ width: '60px' }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.addMapping',
              {
                defaultMessage: 'Add',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const SelectedFieldMappings: React.FC = () => {
  const { removeFieldFromMapping } = useActions(MLInferenceLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);

  const columns: Array<EuiBasicTableColumn<FieldMapping>> = [
    {
      'data-test-subj': 'sourceFieldCell',
      field: 'sourceField',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.fieldMappings.sourceFieldHeader',
        {
          defaultMessage: 'Source fields',
        }
      ),
    },
    {
      align: 'left',
      name: '',
      render: () => <EuiIcon type="sortRight" />,
      width: '60px',
    },
    {
      field: 'targetField',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.fieldMappings.targetFieldHeader',
        {
          defaultMessage: 'Target fields',
        }
      ),
    },
    {
      actions: [
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.actions.deleteMapping',
            {
              defaultMessage: 'Delete this mapping',
            }
          ),
          icon: 'trash',
          isPrimary: true,
          name: (fieldMapping) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.actions.deleteMapping.caption',
              {
                defaultMessage: `Delete mapping '{sourceField}' - '{targetField}'`,
                values: {
                  sourceField: fieldMapping.sourceField,
                  targetField: fieldMapping.targetField,
                },
              }
            ),
          onClick: (fieldMapping) => removeFieldFromMapping(fieldMapping.sourceField),
          type: 'icon',
        },
      ],
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.actions',
        {
          defaultMessage: 'Actions',
        }
      ),
      width: '10%',
    },
  ];

  return (
    <>
      <EuiBasicTable
        columns={columns}
        items={configuration.fieldMappings ?? []}
        rowHeader="sourceField"
        tableCaption={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.fieldMappings.tableCaption',
          {
            defaultMessage: 'Field mappings',
          }
        )}
        noItemsMessage={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.fieldMappings.noFieldMappings',
          {
            defaultMessage: 'No field mappings selected',
          }
        )}
      />
    </>
  );
};
