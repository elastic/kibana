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
  EuiTextArea,
} from '@elastic/eui';
import styled from 'styled-components';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { DATASET_VAR_NAME } from '../../../../../../../../../common/constants';

import type { DataStream, RegistryVarsEntry } from '../../../../../../types';

import { MultiTextInput } from './multi_text_input';
import { DatasetComboBox } from './dataset_combo';

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
  packageType?: string;
  packageName?: string;
  datastreams?: DataStream[];
  isEditPage?: boolean;
}> = memo(
  ({
    varDef,
    value,
    onChange,
    errors: varErrors,
    forceShowErrors,
    frozen,
    packageType,
    packageName,
    datastreams = [],
    isEditPage = false,
  }) => {
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
      if (name === DATASET_VAR_NAME && packageType === 'input') {
        return (
          <DatasetComboBox
            pkgName={packageName}
            datastreams={datastreams}
            value={value}
            onChange={onChange}
            isDisabled={isEditPage}
          />
        );
      }
      switch (type) {
        case 'textarea':
          return (
            <EuiTextArea
              isInvalid={isInvalid}
              value={value === undefined ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => setIsDirty(true)}
              disabled={frozen}
              resize="vertical"
            />
          );
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
    }, [
      multi,
      name,
      packageType,
      type,
      value,
      onChange,
      frozen,
      packageName,
      datastreams,
      isEditPage,
      isInvalid,
      fieldLabel,
    ]);

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
        helpText={description && <ReactMarkdown children={description} />}
      >
        {field}
      </EuiFormRow>
    );
  }
);
