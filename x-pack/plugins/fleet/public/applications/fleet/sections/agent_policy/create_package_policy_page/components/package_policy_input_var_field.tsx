/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiText,
  EuiCodeEditor,
  EuiTextArea,
  EuiFieldPassword,
} from '@elastic/eui';

import type { RegistryVarsEntry } from '../../../../types';

import 'brace/mode/yaml';
import 'brace/theme/textmate';
import { MultiTextInput } from './multi_text_input';

export const PackagePolicyInputVarField: React.FunctionComponent<{
  varDef: RegistryVarsEntry;
  value: any;
  onChange: (newValue: any) => void;
  errors?: string[] | null;
  forceShowErrors?: boolean;
  frozen?: boolean;
}> = memo(({ varDef, value, onChange, errors: varErrors, forceShowErrors, frozen }) => {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { multi, required, type, title, name, description } = varDef;
  const isInvalid = (isDirty || forceShowErrors) && !!varErrors;
  const errors = isInvalid ? varErrors : null;
  const fieldLabel = title || name;

  const field = useMemo(() => {
    if (multi) {
      return (
        <MultiTextInput
          value={value}
          onChange={onChange}
          onBlur={() => setIsDirty(true)}
          isDisabled={frozen}
        />
      );
    }
    switch (type) {
      case 'yaml':
        return frozen ? (
          <EuiTextArea
            className="ace_editor"
            disabled
            value={value}
            style={{ height: '175px', padding: '4px', whiteSpace: 'pre', resize: 'none' }}
          />
        ) : (
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
      case 'bool':
        return (
          <EuiSwitch
            label={fieldLabel}
            checked={value}
            showLabel={false}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={() => setIsDirty(true)}
            disabled={frozen}
          />
        );
      case 'password':
        return (
          <EuiFieldPassword
            type="dual"
            isInvalid={isInvalid}
            value={value === undefined ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsDirty(true)}
            disabled={frozen}
          />
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={value === undefined ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsDirty(true)}
            disabled={frozen}
          />
        );
    }
  }, [isInvalid, multi, onChange, type, value, fieldLabel, frozen]);

  // Boolean cannot be optional by default set to false
  const isOptional = useMemo(() => type !== 'bool' && !required, [required, type]);

  return (
    <EuiFormRow
      isInvalid={isInvalid}
      error={errors}
      label={fieldLabel}
      labelAppend={
        isOptional ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
              defaultMessage="Optional"
            />
          </EuiText>
        ) : null
      }
      helpText={<ReactMarkdown source={description} />}
    >
      {field}
    </EuiFormRow>
  );
});
