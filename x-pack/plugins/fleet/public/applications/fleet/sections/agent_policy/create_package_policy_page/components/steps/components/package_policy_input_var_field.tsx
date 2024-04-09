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
  EuiLink,
  EuiIconTip,
} from '@elastic/eui';
import styled from 'styled-components';

import { CodeEditor } from '@kbn/code-editor';

import { useFleetStatus, useStartServices } from '../../../../../../../../hooks';

import { DATASET_VAR_NAME } from '../../../../../../../../../common/constants';

import type { DataStream, RegistryVarsEntry } from '../../../../../../types';

import { MultiTextInput } from './multi_text_input';
import { DatasetComboBox } from './dataset_combo';

const FixedHeightDiv = styled.div`
  height: 300px;
`;

const FormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    flex: 1;
  }

  .euiFormRow__fieldWrapper > .euiPanel {
    padding: ${(props) => props.theme.eui.euiSizeXS};
  }
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
    const fleetStatus = useFleetStatus();

    const [isDirty, setIsDirty] = useState<boolean>(false);
    const { required, type, title, name, description } = varDef;
    const isInvalid = Boolean((isDirty || forceShowErrors) && !!varErrors?.length);
    const errors = isInvalid ? varErrors : null;
    const fieldLabel = title || name;
    const fieldTestSelector = fieldLabel.replace(/\s/g, '-').toLowerCase();
    // Boolean cannot be optional by default set to false
    const isOptional = useMemo(() => type !== 'bool' && !required, [required, type]);

    const secretsStorageEnabled = fleetStatus.isReady && fleetStatus.isSecretsStorageEnabled;
    const useSecretsUi = secretsStorageEnabled && varDef.secret;

    let field: JSX.Element;

    if (useSecretsUi) {
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

    const formRow = (
      <FormRow
        isInvalid={isInvalid}
        error={errors}
        label={useSecretsUi ? <SecretFieldLabel fieldLabel={fieldLabel} /> : fieldLabel}
        labelAppend={
          isOptional ? (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
                defaultMessage="Optional"
              />
            </EuiText>
          ) : undefined
        }
        helpText={description && <ReactMarkdown children={description} />}
        fullWidth
      >
        {field}
      </FormRow>
    );

    return useSecretsUi ? <SecretFieldWrapper>{formRow}</SecretFieldWrapper> : formRow;
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
        fieldLabel={fieldLabel}
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

const SecretFieldWrapper = ({ children }: { children: React.ReactNode }) => {
  const { docLinks } = useStartServices();

  return (
    <EuiPanel hasShadow={false} color="subdued" paddingSize="m">
      {children}

      <EuiSpacer size="l" />

      <EuiText size="xs">
        <EuiLink href={docLinks.links.fleet.policySecrets} target="_blank">
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.secretLearnMoreText"
            defaultMessage="Learn more about policy secrets."
          />
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};

const SecretFieldLabel = ({ fieldLabel }: { fieldLabel: string }) => {
  return (
    <>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="xs">
        <EuiFlexItem grow={false} aria-label={fieldLabel}>
          {fieldLabel}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="iInCircle"
            position="top"
            content={
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.secretLearnMorePopoverContent"
                defaultMessage="This value is a secret. After you save this integration policy, you won't be able to view the value again."
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </>
  );
};

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
  const [isReplacing, setIsReplacing] = useState(isEditPage && !value);
  const valueOnFirstRender = useRef(value);

  const hasExistingValue = !!valueOnFirstRender.current;
  const lowercaseTitle = varDef.title?.toLowerCase();
  const showInactiveReplaceUi = isEditPage && !isReplacing && hasExistingValue;
  const valueIsSecretRef = value && value?.isSecretRef;

  const inputComponent = getInputComponent({
    varDef,
    value: isReplacing && valueIsSecretRef ? '' : value,
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

  // If there's no value for this secret, display the input as its "brand new" creation state
  // instead of the "replace" state
  if (!hasExistingValue) {
    return inputComponent;
  }

  if (showInactiveReplaceUi) {
    return (
      <>
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
          onClick={() => setIsReplacing(true)}
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
      </>
    );
  }

  if (isReplacing) {
    const cancelButton = (
      <EuiButtonEmpty
        onClick={() => {
          setIsReplacing(false);
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
          {inputComponent}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return inputComponent;
}
