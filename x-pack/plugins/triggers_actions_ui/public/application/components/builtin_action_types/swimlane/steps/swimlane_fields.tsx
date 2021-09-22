/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption, EuiButtonGroup } from '@elastic/eui';
import * as i18n from '../translations';
import {
  SwimlaneActionConnector,
  SwimlaneConnectorType,
  SwimlaneFieldMappingConfig,
  SwimlaneMappingConfig,
} from '../types';
import { IErrorObject } from '../../../../../types';
import { isValidFieldForConnector } from '../helpers';

const SINGLE_SELECTION = { asPlainText: true };
const EMPTY_COMBO_BOX_ARRAY: Array<EuiComboBoxOptionOption<string>> | undefined = [];

const formatOption = (field: SwimlaneFieldMappingConfig) => ({
  label: `${field.name} (${field.key})`,
  value: field.id,
});

const createSelectedOption = (field: SwimlaneFieldMappingConfig | null | undefined) =>
  field != null ? [formatOption(field)] : EMPTY_COMBO_BOX_ARRAY;

interface Props {
  action: SwimlaneActionConnector;
  editActionConfig: (property: string, value: any) => void;
  updateCurrentStep: (step: number) => void;
  fields: SwimlaneFieldMappingConfig[];
  errors: IErrorObject;
}

const connectorTypeButtons = [
  { id: SwimlaneConnectorType.All, label: 'All' },
  { id: SwimlaneConnectorType.Alerts, label: 'Alerts' },
  { id: SwimlaneConnectorType.Cases, label: 'Cases' },
];

const SwimlaneFieldsComponent: React.FC<Props> = ({
  action,
  editActionConfig,
  updateCurrentStep,
  fields,
  errors,
}) => {
  const { mappings, connectorType = SwimlaneConnectorType.All } = action.config;
  const prevConnectorType = useRef<SwimlaneConnectorType>(connectorType);
  const hasChangedConnectorType = connectorType !== prevConnectorType.current;

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

  const state = useMemo(
    () => ({
      alertIdConfig: createSelectedOption(mappings?.alertIdConfig),
      severityConfig: createSelectedOption(mappings?.severityConfig),
      ruleNameConfig: createSelectedOption(mappings?.ruleNameConfig),
      caseIdConfig: createSelectedOption(mappings?.caseIdConfig),
      caseNameConfig: createSelectedOption(mappings?.caseNameConfig),
      commentsConfig: createSelectedOption(mappings?.commentsConfig),
      descriptionConfig: createSelectedOption(mappings?.descriptionConfig),
    }),
    [mappings]
  );

  const mappingErrors: Record<string, string> = useMemo(
    () => (Array.isArray(errors?.mappings) ? errors?.mappings[0] : {}),
    [errors]
  );

  const editMappings = useCallback(
    (key: keyof SwimlaneMappingConfig, e: Array<EuiComboBoxOptionOption<string>>) => {
      if (e.length === 0) {
        const newProps = {
          ...mappings,
          [key]: null,
        };
        editActionConfig('mappings', newProps);
        return;
      }

      const option = e[0];
      const item = fieldIdMap.get(option.value ?? '');
      if (!item) {
        return;
      }

      const newProps = {
        ...mappings,
        [key]: { id: item.id, name: item.name, key: item.key, fieldType: item.fieldType },
      };
      editActionConfig('mappings', newProps);
    },
    [editActionConfig, fieldIdMap, mappings]
  );

  useEffect(() => {
    if (connectorType !== prevConnectorType.current) {
      prevConnectorType.current = connectorType;
    }
  }, [connectorType]);

  return (
    <>
      <EuiFormRow id="connectorType" fullWidth label={i18n.SW_CONNECTOR_TYPE_LABEL}>
        <EuiButtonGroup
          name="connectorType"
          legend={i18n.SW_CONNECTOR_TYPE_LABEL}
          options={connectorTypeButtons}
          idSelected={connectorType}
          onChange={(type) => editActionConfig('connectorType', type)}
          buttonSize="compressed"
        />
      </EuiFormRow>
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType.All, 'alertIdConfig') && (
        <>
          <EuiFormRow
            id="alertIdConfig"
            fullWidth
            label={i18n.SW_ALERT_ID_FIELD_LABEL}
            error={mappingErrors?.alertIdConfig}
            isInvalid={mappingErrors?.alertIdConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.alertIdConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneAlertIdInput"
              onChange={(e) => editMappings('alertIdConfig', e)}
              isInvalid={mappingErrors?.alertIdConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'ruleNameConfig') && (
        <>
          <EuiFormRow
            id="ruleNameConfig"
            fullWidth
            label={i18n.SW_RULE_NAME_FIELD_LABEL}
            error={mappingErrors?.ruleNameConfig}
            isInvalid={mappingErrors?.ruleNameConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.ruleNameConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneAlertNameInput"
              onChange={(e) => editMappings('ruleNameConfig', e)}
              isInvalid={mappingErrors?.ruleNameConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'severityConfig') && (
        <>
          <EuiFormRow
            id="severityConfig"
            fullWidth
            label={i18n.SW_SEVERITY_FIELD_LABEL}
            error={mappingErrors?.severityConfig}
            isInvalid={mappingErrors?.severityConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.severityConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneSeverityInput"
              onChange={(e) => editMappings('severityConfig', e)}
              isInvalid={mappingErrors?.severityConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseIdConfig') && (
        <>
          <EuiFormRow
            id="caseIdConfig"
            fullWidth
            label={i18n.SW_CASE_ID_FIELD_LABEL}
            error={mappingErrors?.caseIdConfig}
            isInvalid={mappingErrors?.caseIdConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.caseIdConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneCaseIdConfig"
              onChange={(e) => editMappings('caseIdConfig', e)}
              isInvalid={mappingErrors?.caseIdConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'caseNameConfig') && (
        <>
          <EuiFormRow
            id="caseNameConfig"
            fullWidth
            label={i18n.SW_CASE_NAME_FIELD_LABEL}
            error={mappingErrors?.caseNameConfig}
            isInvalid={mappingErrors?.caseNameConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.caseNameConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneCaseNameConfig"
              onChange={(e) => editMappings('caseNameConfig', e)}
              isInvalid={mappingErrors?.caseNameConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'commentsConfig') && (
        <>
          <EuiFormRow
            id="commentsConfig"
            fullWidth
            label={i18n.SW_COMMENTS_FIELD_LABEL}
            error={mappingErrors?.commentsConfig}
            isInvalid={mappingErrors?.commentsConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.commentsConfig}
              options={commentsOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneCommentsConfig"
              onChange={(e) => editMappings('commentsConfig', e)}
              isInvalid={mappingErrors?.commentsConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
      {isValidFieldForConnector(connectorType as SwimlaneConnectorType, 'descriptionConfig') && (
        <>
          <EuiFormRow
            id="descriptionConfig"
            fullWidth
            label={i18n.SW_DESCRIPTION_FIELD_LABEL}
            error={mappingErrors?.descriptionConfig}
            isInvalid={mappingErrors?.descriptionConfig != null && !hasChangedConnectorType}
          >
            <EuiComboBox
              fullWidth
              selectedOptions={state.descriptionConfig}
              options={textOptions}
              singleSelection={SINGLE_SELECTION}
              data-test-subj="swimlaneDescriptionConfig"
              onChange={(e) => editMappings('descriptionConfig', e)}
              isInvalid={mappingErrors?.descriptionConfig != null && !hasChangedConnectorType}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
};

export const SwimlaneFields = React.memo(SwimlaneFieldsComponent);
