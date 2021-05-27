/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButton, EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import * as i18n from '../translations';
import { UserConfiguredActionConnector } from '../../../../../types';
import {
  SwimlaneFieldMappingConfig,
  SwimlaneMappingConfig,
  SwimlaneConfig,
  SwimlaneSecrets,
} from '../types';

const SINGLE_SELECTION = { asPlainText: true };
const EMPTY_COMBO_BOX_ARRAY: Array<EuiComboBoxOptionOption<string>> | undefined = [];

const formatOption = (field: SwimlaneFieldMappingConfig) => ({
  label: `${field.name} (${field.key})`,
  value: field.id,
});

const createSelectedOption = (field: SwimlaneFieldMappingConfig | null | undefined) =>
  field != null ? [formatOption(field)] : EMPTY_COMBO_BOX_ARRAY;

interface Props {
  action: UserConfiguredActionConnector<SwimlaneConfig, SwimlaneSecrets>;
  editActionConfig: (property: string, value: any) => void;
  updateCurrentStep: (step: number) => void;
  fields: SwimlaneFieldMappingConfig[];
}

const SwimlaneFieldsComponent: React.FC<Props> = ({
  action,
  editActionConfig,
  updateCurrentStep,
  fields,
}) => {
  const { mappings } = action.config;
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
      alertSourceConfig: createSelectedOption(mappings?.alertSourceConfig),
      severityConfig: createSelectedOption(mappings?.severityConfig),
      alertNameConfig: createSelectedOption(mappings?.alertNameConfig),
      caseIdConfig: createSelectedOption(mappings?.caseIdConfig),
      caseNameConfig: createSelectedOption(mappings?.caseNameConfig),
      commentsConfig: createSelectedOption(mappings?.commentsConfig),
      descriptionConfig: createSelectedOption(mappings?.descriptionConfig),
    }),
    [mappings]
  );

  const resetConnection = useCallback(() => {
    updateCurrentStep(1);
  }, [updateCurrentStep]);

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
  return (
    <>
      <EuiFormRow id="alertSourceConfig" fullWidth label={i18n.SW_ALERT_SOURCE_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.alertSourceConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneAlertSourceInput"
          onChange={(e) => editMappings('alertSourceConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="severityConfig" fullWidth label={i18n.SW_SEVERITY_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.severityConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneSeverityInput"
          onChange={(e) => editMappings('severityConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="alertNameConfig" fullWidth label={i18n.SW_ALERT_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.alertNameConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneAlertNameInput"
          onChange={(e) => editMappings('alertNameConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="caseIdConfig" fullWidth label={i18n.SW_CASE_ID_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.caseIdConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCaseIdConfig"
          onChange={(e) => editMappings('caseIdConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="caseNameConfig" fullWidth label={i18n.SW_CASE_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.caseNameConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCaseNameConfig"
          onChange={(e) => editMappings('caseNameConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="commentsConfig" fullWidth label={i18n.SW_COMMENTS_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.commentsConfig}
          options={commentsOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCommentsConfig"
          onChange={(e) => editMappings('commentsConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="descriptionConfig" fullWidth label={i18n.SW_DESCRIPTION_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={state.descriptionConfig}
          options={textOptions}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneDescriptionConfig"
          onChange={(e) => editMappings('descriptionConfig', e)}
        />
      </EuiFormRow>
      <EuiButton onClick={resetConnection}>{i18n.SW_CONFIGURE_API_LABEL}</EuiButton>
    </>
  );
};

export const SwimlaneFields = React.memo(SwimlaneFieldsComponent);
