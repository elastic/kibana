/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButton, EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import * as i18n from '../translations';
import { StepProps } from './';

const SINGLE_SELECTION = { asPlainText: true };
const empty = { label: '', value: '' };

const findOption = (
  options: Array<EuiComboBoxOptionOption<string | number>>,
  searchValue: string
): EuiComboBoxOptionOption<string | number> => {
  return options.find((f) => searchValue === f.value) ?? empty;
};

const findItem = (fields: StepProps['fields'], searchValue: string | number) => {
  return fields.find((f) => searchValue === f.id);
};

export const SwimlaneFields: React.FunctionComponent<StepProps> = ({
  action,
  editActionConfig,
  updateCurrentStep,
  fields,
}) => {
  const { mappings } = action.config;
  const options = useMemo(
    () =>
      fields
        .filter((f) => f.fieldType === 'text' || f.fieldType === 'comments')
        .map((f) => ({ label: `${f.name} (${f.key})`, value: f.id }))
        .sort((a, b) => (a.label?.toLowerCase() > b.label?.toLowerCase() ? 1 : -1)),
    [fields]
  );

  const state = useMemo(
    () => ({
      alertSourceConfig: findOption(options, mappings?.alertSourceConfig?.id),
      severityConfig: findOption(options, mappings?.severityConfig?.id),
      alertNameConfig: findOption(options, mappings?.alertNameConfig?.id),
      caseIdConfig: findOption(options, mappings?.caseIdConfig?.id),
      caseNameConfig: findOption(options, mappings?.caseNameConfig?.id),
      commentsConfig: findOption(options, mappings?.commentsConfig?.id),
      descriptionConfig: findOption(options, mappings?.descriptionConfig?.id),
    }),
    [options, mappings]
  );

  const resetConnection = useCallback(() => {
    updateCurrentStep(1);
  }, [updateCurrentStep]);

  const editMappings = useCallback(
    (key: string, e: Array<EuiComboBoxOptionOption<string | number>>) => {
      const option = e[0];
      if (!option?.value) {
        return;
      }
      const item = findItem(fields, option.value);
      if (!item) {
        return;
      }
      const newProps = {
        ...mappings,
        [key]: { id: item.id, name: item.name, key: item.key, fieldType: item.fieldType },
      };
      editActionConfig('mappings', newProps);
    },
    [editActionConfig, fields, mappings]
  );
  return (
    <>
      <EuiFormRow id="alertSourceConfig" fullWidth label={i18n.SW_ALERT_SOURCE_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.alertSourceConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneAlertSourceInput"
          onChange={(e) => editMappings('alertSourceConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="severityConfig" fullWidth label={i18n.SW_SEVERITY_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.severityConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneSeverityInput"
          onChange={(e) => editMappings('severityConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="alertNameConfig" fullWidth label={i18n.SW_ALERT_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.alertNameConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneAlertNameInput"
          onChange={(e) => editMappings('alertNameConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="caseIdConfig" fullWidth label={i18n.SW_CASE_ID_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.caseIdConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCaseIdConfig"
          onChange={(e) => editMappings('caseIdConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="caseNameConfig" fullWidth label={i18n.SW_CASE_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.caseNameConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCaseNameConfig"
          onChange={(e) => editMappings('caseNameConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="commentsConfig" fullWidth label={i18n.SW_COMMENTS_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.commentsConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneCommentsConfig"
          onChange={(e) => editMappings('commentsConfig', e)}
        />
      </EuiFormRow>
      <EuiFormRow id="descriptionConfig" fullWidth label={i18n.SW_DESCRIPTION_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.descriptionConfig]}
          options={options}
          singleSelection={SINGLE_SELECTION}
          data-test-subj="swimlaneDescriptionConfig"
          onChange={(e) => editMappings('descriptionConfig', e)}
        />
      </EuiFormRow>
      <EuiButton color="warning" onClick={resetConnection}>
        {i18n.SW_RETRIEVE_CONFIGURATION_RESET_LABEL}
      </EuiButton>
    </>
  );
};
