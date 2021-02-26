/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useState } from 'react';
import { EuiButton, EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import * as i18n from '../translations';
import { StepProps } from './';
import { SwimlaneFieldMappingConfig } from '../types';

export const SwimlaneFields: React.FunctionComponent<StepProps> = ({
  action,
  editActionConfig,
  updateCurrentStep,
  fields,
}) => {
  const { mappings } = action.config;

  const buildItem = (f: SwimlaneFieldMappingConfig) => {
    return { label: `${f.name} (${f.key})`, value: f.id };
  };

  const options = fields
    .filter((f) => f.fieldType === 'text')
    .map((f) => buildItem(f))
    .sort((a, b) => (a.label?.toLowerCase() > b.label?.toLowerCase() ? 1 : -1));

  const findOption = useCallback(
    (searchValue: string) => {
      return options.find((f) => searchValue === f.value);
    },
    [options]
  );

  const findItem = useCallback(
    (searchValue: string) => {
      return fields.find((f) => searchValue === f.id);
    },
    [fields]
  );

  const [state, setState] = useState({
    alertSourceConfig: findOption(mappings?.alertSourceConfig?.id),
    severityConfig: findOption(mappings?.severityConfig?.id),
    alertNameConfig: findOption(mappings?.alertNameConfig?.id),
    caseIdConfig: findOption(mappings?.caseIdConfig?.id),
    caseNameConfig: findOption(mappings?.caseNameConfig?.id),
    commentsConfig: findOption(mappings?.commentsConfig?.id),
  });

  const resetConnection = () => {
    // reset fields
    // setConnectionStatus('incomplete');
    updateCurrentStep(1);
  };

  const resetConnectionButton = (
    <EuiButton color="warning" onClick={() => resetConnection()}>
      {i18n.SW_RETRIEVE_CONFIGURATION_RESET_LABEL}
    </EuiButton>
  );

  const editMappings = useCallback(
    (key: string, option: EuiComboBoxOptionOption<string>) => {
      if (!option?.value) {
        return;
      }
      const item = findItem(option.value);
      if (!item) {
        return;
      }
      const newProps = {
        ...mappings,
        [key]: { id: item.id, name: item.name, key: item.key, fieldType: item.fieldType },
      };
      editActionConfig('mappings', newProps);
      setState((currentState) => ({ ...currentState, [key]: findOption(item.id) }));
    },
    [editActionConfig, mappings, findItem, setState, findOption]
  );

  const empty = { label: '', value: '' };
  return (
    <Fragment>
      <EuiFormRow id="alertSourceConfig" fullWidth label={i18n.SW_ALERT_SOURCE_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.alertSourceConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          data-test-subj="swimlaneAlertSourceInput"
          onChange={(e) => {
            editMappings('alertSourceConfig', e[0]);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="severityConfig" fullWidth label={i18n.SW_SEVERITY_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.severityConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          isInvalid={!state.severityConfig?.value}
          data-test-subj="swimlaneSeverityInput"
          onChange={(e) => {
            editMappings('severityConfig', e[0]);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="alertNameConfig" fullWidth label={i18n.SW_ALERT_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.alertNameConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          // required={false}
          data-test-subj="swimlaneAlertNameInput"
          onChange={(e) => {
            editMappings('alertNameConfig', e[0]);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="caseIdConfig" fullWidth label={i18n.SW_CASE_ID_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.caseIdConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          // required={false}
          data-test-subj="swimlaneCaseIdNameInput"
          onChange={(e) => {
            editMappings('caseIdConfig', e[0]);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="caseNameConfig" fullWidth label={i18n.SW_CASE_NAME_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.caseNameConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          // required={false}
          data-test-subj="swimlaneCaseNameInput"
          onChange={(e) => {
            editMappings('caseNameConfig', e[0]);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="commentsConfig" fullWidth label={i18n.SW_COMMENTS_FIELD_LABEL}>
        <EuiComboBox
          fullWidth
          selectedOptions={[state.commentsConfig || empty]}
          options={options}
          singleSelection={{ asPlainText: true }}
          // required={false}
          data-test-subj="swimlaneCommentsInput"
          onChange={(e) => {
            editMappings('commentsConfig', e[0]);
          }}
        />
      </EuiFormRow>
      {resetConnectionButton}
    </Fragment>
  );
};
