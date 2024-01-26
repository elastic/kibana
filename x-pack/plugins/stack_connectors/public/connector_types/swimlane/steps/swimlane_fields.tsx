/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps, EuiFormRow } from '@elastic/eui';
import {
  FieldConfig,
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ComboBoxField, ButtonGroupField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import * as i18n from '../translations';
import {
  MappingConfigurationKeys,
  SwimlaneConnectorType,
  SwimlaneFieldMappingConfig,
} from '../types';
import { isRequiredField, isValidFieldForConnector } from '../helpers';

const { emptyField } = fieldValidators;

const SINGLE_SELECTION = { asPlainText: true };
const EMPTY_COMBO_BOX_ARRAY: Array<EuiComboBoxOptionOption<string>> | undefined = [];

const formatOption = (field: SwimlaneFieldMappingConfig) => ({
  label: `${field.name} (${field.key})`,
  value: field.id,
});

const createSelectedOption = (field: SwimlaneFieldMappingConfig | null | undefined) =>
  field != null ? [formatOption(field)] : EMPTY_COMBO_BOX_ARRAY;

interface Props {
  readOnly: boolean;
  fields: SwimlaneFieldMappingConfig[];
}

const connectorTypeButtons = [
  { id: SwimlaneConnectorType.All, label: 'All' },
  { id: SwimlaneConnectorType.Alerts, label: 'Alerts' },
  { id: SwimlaneConnectorType.Cases, label: 'Cases' },
];

const mappingConfig: FieldConfig<SwimlaneFieldMappingConfig | null> = {
  defaultValue: null,
  validations: [
    {
      validator: ({ value, customData }) => {
        const data = customData.value as {
          connectorType: SwimlaneConnectorType;
          validationLabel: string;
        };
        if (isRequiredField(data.connectorType, value?.id as MappingConfigurationKeys)) {
          return {
            message: data.validationLabel,
          };
        }
      },
    },
  ],
};

const MappingField: React.FC<{
  path: string;
  label: string;
  validationLabel: string;
  options: EuiComboBoxProps<string>['options'];
  fieldIdMap: Map<string, SwimlaneFieldMappingConfig>;
  connectorType: SwimlaneConnectorType;
  readOnly: boolean;
  dataTestSubj?: string;
}> = React.memo(
  ({
    path,
    options,
    label,
    validationLabel,
    dataTestSubj,
    fieldIdMap,
    connectorType,
    readOnly,
  }) => {
    return (
      <UseField<SwimlaneFieldMappingConfig | null>
        path={path}
        component={ComboBoxField}
        config={mappingConfig}
        validationData={{ connectorType, validationLabel }}
      >
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          const onComboChange = (opt: Array<EuiComboBoxOptionOption<string>>) => {
            const option = opt[0];

            const item = fieldIdMap.get(option?.value ?? '');
            if (!item) {
              field.setValue(null);
              return;
            }

            field.setValue({
              id: item.id,
              name: item.name,
              key: item.key,
              fieldType: item.fieldType,
            });
          };

          const onSearchComboChange = (value: string) => {
            if (value !== undefined) {
              field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
            }
          };

          const selectedOptions = createSelectedOption(fieldIdMap.get(field.value?.id ?? ''));

          return (
            <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
              <EuiComboBox
                singleSelection={SINGLE_SELECTION}
                selectedOptions={selectedOptions}
                onChange={onComboChange}
                onSearchChange={onSearchComboChange}
                fullWidth
                noSuggestions={false}
                data-test-subj={dataTestSubj}
                options={options}
                isDisabled={readOnly}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
    );
  }
);

const SwimlaneFieldsComponent: React.FC<Props> = ({ fields, readOnly }) => {
  const [{ config }] = useFormData({
    watch: ['config.connectorType'],
  });

  const connectorType = config?.connectorType ?? SwimlaneConnectorType.All;

  const [fieldTypeMap, fieldIdMap] = useMemo(
    () =>
      fields.reduce(
        ([typeMap, idMap], field) => {
          if (field != null) {
            typeMap.set(field.fieldType, [
              ...(typeMap.get(field.fieldType) ?? []),
              formatOption(field),
            ]);
            idMap.set(field.id, field);
          }

          return [typeMap, idMap];
        },
        [
          new Map<string, Array<EuiComboBoxOptionOption<string>>>(),
          new Map<string, SwimlaneFieldMappingConfig>(),
        ]
      ),
    [fields]
  );

  const textOptions = useMemo(() => fieldTypeMap.get('text') ?? [], [fieldTypeMap]);
  const commentsOptions = useMemo(() => fieldTypeMap.get('comments') ?? [], [fieldTypeMap]);

  return (
    <>
      <UseField
        path="config.connectorType"
        component={ButtonGroupField}
        config={{
          label: i18n.SW_CONNECTOR_TYPE_LABEL,
          defaultValue: SwimlaneConnectorType.All,
          validations: [
            {
              validator: emptyField(i18n.SW_REQUIRED_CONNECTOR_TYPE),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            legend: i18n.SW_CONNECTOR_TYPE_LABEL,
            options: connectorTypeButtons,
            buttonSize: 'm',
            color: 'primary',
          },
        }}
      />
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType.All, 'alertIdConfig') && (
        <MappingField
          path="config.mappings.alertIdConfig"
          label={i18n.SW_ALERT_ID_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_ALERT_ID}
          options={textOptions}
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          dataTestSubj="swimlaneAlertIdInput"
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'ruleNameConfig') && (
        <MappingField
          path="config.mappings.ruleNameConfig"
          label={i18n.SW_RULE_NAME_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_ALERT_ID}
          options={textOptions}
          dataTestSubj="swimlaneAlertNameInput"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'severityConfig') && (
        <MappingField
          path="config.mappings.severityConfig"
          label={i18n.SW_SEVERITY_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_SEVERITY}
          options={textOptions}
          dataTestSubj="swimlaneSeverityInput"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseIdConfig') && (
        <MappingField
          path="config.mappings.caseIdConfig"
          label={i18n.SW_CASE_ID_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_CASE_ID}
          options={textOptions}
          dataTestSubj="swimlaneCaseIdConfig"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseNameConfig') && (
        <MappingField
          path="config.mappings.caseNameConfig"
          label={i18n.SW_CASE_NAME_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_CASE_NAME}
          options={textOptions}
          dataTestSubj="swimlaneCaseNameConfig"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'commentsConfig') && (
        <MappingField
          path="config.mappings.commentsConfig"
          label={i18n.SW_COMMENTS_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_COMMENTS}
          options={commentsOptions}
          dataTestSubj="swimlaneCommentsConfig"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'descriptionConfig') && (
        <MappingField
          path="config.mappings.descriptionConfig"
          label={i18n.SW_DESCRIPTION_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_DESCRIPTION}
          options={textOptions}
          dataTestSubj="swimlaneDescriptionConfig"
          fieldIdMap={fieldIdMap}
          connectorType={connectorType}
          readOnly={readOnly}
        />
      )}
    </>
  );
};

export const SwimlaneFields = React.memo(SwimlaneFieldsComponent);
