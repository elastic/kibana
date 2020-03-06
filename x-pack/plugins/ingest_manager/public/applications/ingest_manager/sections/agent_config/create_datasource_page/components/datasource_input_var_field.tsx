/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiComboBox, EuiText } from '@elastic/eui';

export const DatasourceInputVarField: React.FunctionComponent<{
  varDef: any; // TODO: Type this correctly
  value: any;
  onChange: (newValue: any) => void;
}> = ({ varDef, value, onChange }) => {
  return (
    <EuiFormRow
      label={varDef.name}
      labelAppend={
        !varDef.required ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ingestManager.createDatasource.stepConfigure.inputVarFieldOptionalLabel"
              defaultMessage="Optional"
            />
          </EuiText>
        ) : null
      }
      helpText={varDef.description}
    >
      {varDef.multi ? (
        <EuiComboBox
          noSuggestions
          selectedOptions={value.map((val: string) => ({ label: val }))}
          onCreateOption={(newVal: any) => {
            // debugger;
            onChange([...value, newVal]);
          }}
          onChange={(newVals: any[]) => {
            // debugger;
            onChange(newVals.map(val => val.label));
          }}
        />
      ) : (
        <EuiFieldText value={value} onChange={e => onChange(e.target.value)} />
      )}
    </EuiFormRow>
  );
};
