/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiComboBox, EuiText, EuiCodeEditor } from '@elastic/eui';
import { RegistryVarsEntry } from '../../../../types';

import 'brace/mode/yaml';
import 'brace/theme/textmate';

export const PackageConfigInputVarField: React.FunctionComponent<{
  varDef: RegistryVarsEntry;
  value: any;
  onChange: (newValue: any) => void;
  errors?: string[] | null;
  forceShowErrors?: boolean;
}> = ({ varDef, value, onChange, errors: varErrors, forceShowErrors }) => {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { multi, required, type, title, name, description } = varDef;
  const isInvalid = (isDirty || forceShowErrors) && !!varErrors;
  const errors = isInvalid ? varErrors : null;

  const renderField = () => {
    if (multi) {
      return (
        <EuiComboBox
          noSuggestions
          isInvalid={isInvalid}
          selectedOptions={value.map((val: string) => ({ label: val }))}
          onCreateOption={(newVal: any) => {
            onChange([...value, newVal]);
          }}
          onChange={(newVals: any[]) => {
            onChange(newVals.map((val) => val.label));
          }}
          onBlur={() => setIsDirty(true)}
        />
      );
    }
    if (type === 'yaml') {
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
          onChange={(newVal) => onChange(newVal)}
          onBlur={() => setIsDirty(true)}
        />
      );
    }
    return (
      <EuiFieldText
        isInvalid={isInvalid}
        value={value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsDirty(true)}
      />
    );
  };

  return (
    <EuiFormRow
      isInvalid={isInvalid}
      error={errors}
      label={title || name}
      labelAppend={
        !required ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.stepConfigure.inputVarFieldOptionalLabel"
              defaultMessage="Optional"
            />
          </EuiText>
        ) : null
      }
      helpText={<ReactMarkdown source={description} />}
    >
      {renderField()}
    </EuiFormRow>
  );
};
