/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo, useMemo, useRef } from 'react';
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
  EuiComboBox,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import styled from 'styled-components';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { ExperimentalFeaturesService } from '../../../../../../services';

import { DATASET_VAR_NAME } from '../../../../../../../../../common/constants';

import type { DataStream, RegistryVarsEntry } from '../../../../../../types';

import { MultiTextInput } from './multi_text_input';
import { DatasetComboBox } from './dataset_combo';

const FixedHeightDiv = styled.div`
  height: 300px;
`;

interface InputFieldProps {
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
}

type InputComponentProps = InputFieldProps & {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  packageType?: string;
  isInvalid: boolean;
  fieldLabel: string;
  fieldTestSelector: string;
};

export const PackagePolicyInputVarField: React.FunctionComponent<InputFieldProps> = memo(
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
    const { required, type, title, name, description } = varDef;
    const isInvalid = Boolean((isDirty || forceShowErrors) && !!varErrors?.length);
    const errors = isInvalid ? varErrors : null;
    const fieldLabel = title || name;
    const fieldTestSelector = fieldLabel.replace(/\s/g, '-').toLowerCase();
    // Boolean cannot be optional by default set to false
    const isOptional = useMemo(() => type !== 'bool' && !required, [required, type]);

    const { secretsStorage: secretsStorageEnabled } = ExperimentalFeaturesService.get();

    let field: JSX.Element;

    if (secretsStorageEnabled && varDef.secret) {
      field = (
        <SecretInputField
          varDef={varDef}
          value={value}
          onChange={onChange}
          frozen={frozen}
          packageName={packageName}
          packageType={packageType}
          datastreams={datastreams}
          isEditPage={isEditPage}
          isInvalid={isInvalid}
          fieldLabel={fieldLabel}
          fieldTestSelector={fieldTestSelector}
          isDirty={isDirty}
          setIsDirty={setIsDirty}
        />
      );
    } else {
      field = getInputComponent({
        varDef,
        value,
        onChange,
        frozen,
        packageName,
        packageType,
        datastreams,
        isEditPage,
        isInvalid,
        fieldLabel,
        fieldTestSelector,
        isDirty,
        setIsDirty,
      });
    }

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

function getInputComponent({
  varDef,
  value,
  onChange,
  frozen,
  packageName,
  packageType,
  datastreams = [],
  isEditPage,
  isInvalid,
  fieldLabel,
  fieldTestSelector,
  setIsDirty,
}: InputComponentProps) {
  const { multi, type, name, options } = varDef;
  if (multi) {
    return (
      <MultiTextInput
        value={value ?? []}
        onChange={onChange}
        onBlur={() => setIsDirty(true)}
        isDisabled={frozen}
        data-test-subj={`multiTextInput-${fieldTestSelector}`}
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
          data-test-subj={`textAreaInput-${fieldTestSelector}`}
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
          data-test-subj={`switch-${fieldTestSelector}`}
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
          data-test-subj={`passwordInput-${fieldTestSelector}`}
        />
      );
    case 'select':
      const selectOptions = options?.map((option) => ({
        value: option.value,
        label: option.text,
      }));
      const selectedOptions =
        value === undefined ? [] : selectOptions?.filter((option) => option.value === value);
      return (
        <EuiComboBox
          placeholder={i18n.translate('xpack.fleet.packagePolicyField.selectPlaceholder', {
            defaultMessage: 'Select an option',
          })}
          singleSelection={{ asPlainText: true }}
          options={selectOptions}
          selectedOptions={selectedOptions}
          isClearable={true}
          onChange={(newSelectedOptions: Array<{ label: string; value?: string }>) => {
            const newValue =
              newSelectedOptions.length === 0 ? undefined : newSelectedOptions[0].value;
            return onChange(newValue);
          }}
          onBlur={() => setIsDirty(true)}
          data-test-subj={`select-${fieldTestSelector}`}
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
          data-test-subj={`textInput-${fieldTestSelector}`}
        />
      );
  }
}

function SecretInputField({
  varDef,
  value,
  onChange,
  frozen,
  packageName,
  packageType,
  datastreams = [],
  isEditPage,
  isInvalid,
  fieldLabel,
  fieldTestSelector,
  setIsDirty,
  isDirty,
}: InputComponentProps) {
  const [editMode, setEditMode] = useState(isEditPage && !value);
  const valueOnFirstRender = useRef(value);
  const lowercaseTitle = varDef.title?.toLowerCase();
  if (isEditPage && !editMode) {
    return (
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSet"
            defaultMessage="The saved {varName} is hidden. You can only replace the {varName}."
            values={{
              varName: lowercaseTitle,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          onClick={() => setEditMode(true)}
          color="primary"
          iconType="refresh"
          iconSide="left"
          size="xs"
        >
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSetEditButton"
            defaultMessage="Replace {varName}"
            values={{
              varName: lowercaseTitle,
            }}
          />
        </EuiButtonEmpty>
      </EuiPanel>
    );
  }

  const valueIsSecretRef = value && value?.isSecretRef;
  const field = getInputComponent({
    varDef,
    value: editMode && valueIsSecretRef ? '' : value,
    onChange,
    frozen,
    packageName,
    packageType,
    datastreams,
    isEditPage,
    isInvalid,
    fieldLabel,
    fieldTestSelector,
    isDirty,
    setIsDirty,
  });

  if (editMode) {
    const cancelButton = (
      <EuiButtonEmpty
        onClick={() => {
          setEditMode(false);
          setIsDirty(false);
          onChange(valueOnFirstRender.current);
        }}
        color="primary"
        iconType="refresh"
        iconSide="left"
        size="xs"
      >
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSetCancelButton"
          defaultMessage="Cancel {varName} change"
          values={{
            varName: lowercaseTitle,
          }}
        />
      </EuiButtonEmpty>
    );
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false} style={{ width: '100%' }}>
          {field}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return field;
}
