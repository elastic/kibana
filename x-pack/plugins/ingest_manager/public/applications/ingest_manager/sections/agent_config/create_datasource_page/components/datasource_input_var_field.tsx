/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiComboBox, EuiText, EuiCodeEditor } from '@elastic/eui';
import { RegistryVarsEntry } from '../../../../types';

import 'brace/mode/yaml';
import 'brace/theme/textmate';

export const DatasourceInputVarField: React.FunctionComponent<{
  varDef: RegistryVarsEntry;
  value: any;
  onChange: (newValue: any) => void;
}> = ({ varDef, value, onChange }) => {
  const renderField = () => {
    if (varDef.multi) {
      return (
        <EuiComboBox
          noSuggestions
          selectedOptions={value.map((val: string) => ({ label: val }))}
          onCreateOption={(newVal: any) => {
            onChange([...value, newVal]);
          }}
          onChange={(newVals: any[]) => {
            onChange(newVals.map(val => val.label));
          }}
        />
      );
    }
    if (varDef.type === 'yaml') {
      return (
        <EuiCodeEditor
          width="100%"
          mode="yaml"
          theme="textmate"
          setOptions={{
            minLines: 10,
            maxLines: 30,
            tabSize: 2,
            showGutter: false,
          }}
          value={value}
          onChange={newVal => onChange(newVal)}
        />
      );
    }
    return (
      <EuiFieldText
        value={value === undefined ? '' : value}
        onChange={e => onChange(e.target.value)}
      />
    );
  };

  return (
    <EuiFormRow
      label={varDef.title || varDef.name}
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
      helpText={<ReactMarkdown source={varDef.description} />}
    >
      {renderField()}
    </EuiFormRow>
  );
};
