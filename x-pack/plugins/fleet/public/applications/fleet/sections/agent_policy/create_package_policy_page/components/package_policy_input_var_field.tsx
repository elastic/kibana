/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiText,
  EuiFieldPassword,
  EuiCodeBlock,
} from '@elastic/eui';
import styled from 'styled-components';

import type { RegistryVarsEntry } from '../../../../types';
import { CodeEditor } from '../../../../../../../../../../src/plugins/kibana_react/public';

import { MultiTextInput } from './multi_text_input';

const FixedHeightDiv = styled.div`
  height: 300px;
`;

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
          value={value ?? []}
          onChange={onChange}
          onBlur={() => setIsDirty(true)}
          isDisabled={frozen}
        />
      );
    }
    switch (type) {
      case 'yaml':
        return frozen ? (
          <EuiCodeBlock language="yaml" isCopyable={false} paddingSize="s">
            <pre>{value}</pre>
          </EuiCodeBlock>
        ) : (
          <FixedHeightDiv>
            <CodeEditor
              languageId="yaml"
              width="100%"
              height="300px"
              value={value}
              onChange={onChange}
              options={{
                minimap: {
                  enabled: false,
                },
                ariaLabel: i18n.translate('xpack.fleet.packagePolicyField.yamlCodeEditor', {
                  defaultMessage: 'YAML Code Editor',
                }),
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                wrappingIndent: 'indent',
                tabSize: 2,
                // To avoid left margin
                lineNumbers: 'off',
                lineNumbersMinChars: 0,
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                overviewRulerBorder: false,
              }}
            />
          </FixedHeightDiv>
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
