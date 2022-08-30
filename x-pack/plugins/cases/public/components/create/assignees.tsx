/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import React, { memo } from 'react';
import { UseField, FieldConfig } from '../../common/shared_imports';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
}

const getConfig = (): FieldConfig => ({
  label: i18n.ASSIGNEES,
  defaultValue: [],
});

const AssigneesComponent: React.FC<Props> = ({ isLoading }) => {
  return (
    <UseField path="assignees" config={getConfig()}>
      {(field) => {
        const onComboChange = async (options: EuiComboBoxOptionOption[]) => {};

        const onSearchComboChange = (value: string) => {};

        return (
          <EuiFormRow
            id="createCaseAssignees"
            fullWidth
            label={i18n.ASSIGNEES}
            labelAppend={OptionalFieldLabel}
          >
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              async
              isLoading={isLoading}
              options={[]}
              data-test-subj="createCaseAssigneesComboBox"
              selectedOptions={[]}
              isDisabled={isLoading}
              onChange={onComboChange}
              onSearchChange={onSearchComboChange}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

AssigneesComponent.displayName = 'AssigneesComponent';

export const Assignees = memo(AssigneesComponent);
