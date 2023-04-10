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
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FieldMapping } from '../../../../../../../common/ml_inference_pipeline';

import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';

type FieldNames = Array<{ label: string }>;

export const MultiFieldMapping: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration, selectedSourceFields = [] },
    formErrors,
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
            helpText="Select an existing field or type in a field name."
          >
            <EuiComboBox
              fullWidth
              // data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-zeroShot-labels`}
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.selectedFields',
                { defaultMessage: 'Selected fields' }
              )}
              options={fieldOptions}
              selectedOptions={selectedFields}
              onChange={onChangeSelectedFields}
              onCreateOption={onCreateField}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText style={{ paddingTop: '25px' }}>
            <p>-&gt;</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.targetField.label',
              {
                defaultMessage: 'Target field',
              }
            )}
            helpText="This name is automatically created based on your source field."
            error={formErrors.destinationField}
            isInvalid={formErrors.destinationField !== undefined}
            fullWidth
          >
            <EuiFieldText
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-targetField`}
              disabled
              value="This is automatically created"
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ paddingTop: '20px' }}>
          <EuiButton
            color="primary"
            // data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-create`}
            iconType="plusInCircle"
            onClick={addSelectedFieldsToMapping}
            style={{ width: '60px' }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.fields.add',
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
      // 'data-test-subj': 'sourceFieldCell',
      field: 'sourceField',
      name: 'Source fields',
    },
    {
      name: '',
      render: () => <p>-&gt;</p>,
      width: '30px',
    },
    {
      field: 'targetField',
      name: 'Target fields',
    },
    {
      actions: [
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.searchIndices.actions.deleteIndex.title',
            {
              defaultMessage: 'Delete this mapping',
            }
          ),
          icon: 'trash',
          isPrimary: true,
          name: (fieldMapping) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.actions.deleteIndex.caption',
              {
                defaultMessage: 'Delete mapping',
              }
            ),
          onClick: (fieldMapping) => removeFieldFromMapping(fieldMapping.sourceField),
          type: 'icon',
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '10%',
    },
  ];

  return (
    <>
      <EuiBasicTable
        columns={columns}
        itemId={(fieldMapping) => fieldMapping.sourceField}
        items={configuration.fieldMappings ?? []}
        rowHeader="sourceField"
        tableCaption="Field mappings"
        noItemsMessage="No field mappings selected"
      />
    </>
  );
};
