/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps, EuiFormRow } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import * as i18n from '../translations';
import { SwimlaneConnectorType, SwimlaneFieldMappingConfig } from '../types';
import { isValidFieldForConnector } from '../helpers';
import { ButtonGroupField } from '../../../button_group_field';

const SINGLE_SELECTION = { asPlainText: true };
const EMPTY_COMBO_BOX_ARRAY: Array<EuiComboBoxOptionOption<string>> | undefined = [];

const formatOption = (field: SwimlaneFieldMappingConfig) => ({
  label: `${field.name} (${field.key})`,
  value: field.id,
});

const createSelectedOption = (field: SwimlaneFieldMappingConfig | null | undefined) =>
  field != null ? [formatOption(field)] : EMPTY_COMBO_BOX_ARRAY;

interface Props {
  updateCurrentStep: (step: number) => void;
  fields: SwimlaneFieldMappingConfig[];
}

const connectorTypeButtons = [
  { id: SwimlaneConnectorType.All, label: 'All' },
  { id: SwimlaneConnectorType.Alerts, label: 'Alerts' },
  { id: SwimlaneConnectorType.Cases, label: 'Cases' },
];

const { emptyField } = fieldValidators;

const MappingField: React.FC<{
  path: string;
  label: string;
  validationLabel: string;
  options: EuiComboBoxProps<string>['options'];
  dataTestSubj?: string;
}> = ({ path, options, label, validationLabel, dataTestSubj }) => {
  return (
    <UseField
      path={path}
      component={ComboBoxField}
      config={{
        defaultValue: [],
        validations: [
          {
            validator: emptyField(validationLabel),
          },
          {
            validator: emptyField(validationLabel),
            type: VALIDATION_TYPES.ARRAY_ITEM,
          },
        ],
      }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        const onComboChange = (opt: EuiComboBoxOptionOption[]) => {
          field.setValue(opt.map((option) => option.label));
        };

        const onSearchComboChange = (value: string) => {
          if (value !== undefined) {
            field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
          }
        };

        return (
          <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
            <EuiComboBox
              singleSelection={SINGLE_SELECTION}
              selectedOptions={(field.value as string[]).map((v) => ({ label: v }))}
              onChange={onComboChange}
              onSearchChange={onSearchComboChange}
              fullWidth
              noSuggestions={false}
              data-test-subj={dataTestSubj}
              options={options}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

const SwimlaneFieldsComponent: React.FC<Props> = ({ updateCurrentStep, fields }) => {
  const [{ config }] = useFormData({
    watch: ['config.connectorType'],
  });

  const connectorType = config != null ? config.connectorType : SwimlaneConnectorType.All;

  const [fieldTypeMap] = useMemo(
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
      <ButtonGroupField
        defaultValue={SwimlaneConnectorType.All}
        path={'config.connectorType'}
        label={i18n.SW_CONNECTOR_TYPE_LABEL}
        legend={i18n.SW_CONNECTOR_TYPE_LABEL}
        options={connectorTypeButtons}
      />
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType.All, 'alertIdConfig') && (
        <MappingField
          path="config.mappings.alertIdConfig"
          label={i18n.SW_ALERT_ID_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_ALERT_ID}
          options={textOptions}
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'ruleNameConfig') && (
        <MappingField
          path="config.mappings.alertIdConfig"
          label={i18n.SW_RULE_NAME_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_ALERT_ID}
          options={textOptions}
          dataTestSubj="swimlaneApiUrlInput"
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'severityConfig') && (
        <MappingField
          path="config.mappings.severityConfig"
          label={i18n.SW_SEVERITY_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_SEVERITY}
          options={textOptions}
          dataTestSubj="swimlaneSeverityInput"
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseIdConfig') && (
        <MappingField
          path="config.mappings.severityConfig"
          label={i18n.SW_CASE_ID_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_CASE_ID}
          options={textOptions}
          dataTestSubj="swimlaneCaseIdConfig"
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseNameConfig') && (
        <MappingField
          path="config.mappings.caseNameConfig"
          label={i18n.SW_CASE_NAME_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_CASE_NAME}
          options={textOptions}
          dataTestSubj="swimlaneCaseNameConfig"
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'commentsConfig') && (
        <MappingField
          path="config.mappings.commentsConfig"
          label={i18n.SW_COMMENTS_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_COMMENTS}
          options={commentsOptions}
          dataTestSubj="swimlaneCommentsConfig"
        />
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'descriptionConfig') && (
        <MappingField
          path="config.mappings.commentsConfig"
          label={i18n.SW_DESCRIPTION_FIELD_LABEL}
          validationLabel={i18n.SW_REQUIRED_DESCRIPTION}
          options={textOptions}
          dataTestSubj="swimlaneDescriptionConfig"
        />
      )}
    </>
  );
};

export const SwimlaneFields = React.memo(SwimlaneFieldsComponent);
