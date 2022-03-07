/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, memo } from 'react';
import styled from 'styled-components';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiTitle,
} from '@elastic/eui';
import {
  OperatingSystem,
  ConditionEntryField,
  isPathValid,
  hasSimpleExecutableName,
} from '@kbn/securitysolution-utils';
import { isOneOfOperator } from '@kbn/securitysolution-list-utils';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { uniq } from 'lodash';

import { OS_TITLES } from '../../../../common/translations';
import { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import {
  CONDITIONS_HEADER,
  CONDITIONS_HEADER_DESCRIPTION,
  CONDITION_FIELD_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  DESCRIPTION_LABEL,
  DETAILS_HEADER,
  DETAILS_HEADER_DESCRIPTION,
  FIELD_LABEL,
  NAME_LABEL,
  OPERATOR_LABEL,
  POLICY_SELECT_DESCRIPTION,
  SELECT_OS_LABEL,
  VALUE_LABEL,
  ERRORS,
} from '../../translations';
import {
  EffectedPolicySelect,
  EffectedPolicySelection,
} from '../../../../components/effected_policy_select';
import {
  GLOBAL_ARTIFACT_TAG,
  BY_POLICY_ARTIFACT_TAG_PREFIX,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import { useLicense } from '../../../../../common/hooks/use_license';
import { isValidHash } from '../../../../../../common/endpoint/service/trusted_apps/validations';
import { isArtifactGlobal } from '../../../../../../common/endpoint/service/artifacts';
import type { PolicyData } from '../../../../../../common/endpoint/types';

interface BlocklistEntry {
  field: ConditionEntryField;
  operator: 'included';
  type: 'match_any';
  value: string[];
}

interface ItemValidation {
  name?: React.ReactNode[];
  value?: React.ReactNode[];
}

function createValidationMessage(message: string): React.ReactNode {
  return <div>{message}</div>;
}

function getDropdownDisplay(field: ConditionEntryField): React.ReactNode {
  return (
    <>
      {CONDITION_FIELD_TITLE[field]}
      <EuiText size="xs" color="subdued">
        {CONDITION_FIELD_DESCRIPTION[field]}
      </EuiText>
    </>
  );
}

function getMarginForGridArea(gridArea: string): string {
  switch (gridArea) {
    case 'field':
      return '0 4px 0 0';
    case 'operator':
      return '0 4px 0 4px';
    case 'value':
      return '0 0 0 4px';
  }

  return '0';
}

const InputGroup = styled.div`
  display: grid;
  grid-template-columns: 25% 25% 50%;
  grid-template-areas: 'field operator value';
`;

const InputItem = styled.div<{ gridArea: string }>`
  grid-area: ${({ gridArea }) => gridArea};
  align-self: center;
  vertical-align: baseline;
  margin: ${({ gridArea }) => getMarginForGridArea(gridArea)};
`;

export const BlockListForm = memo(
  ({ item, policies, policiesIsLoading, onChange }: ArtifactFormComponentProps) => {
    const [visited, setVisited] = useState<{ name: boolean; value: boolean }>({
      name: false,
      value: false,
    });
    const [warnings, setWarnings] = useState<ItemValidation>({});
    const [errors, setErrors] = useState<ItemValidation>({});
    const [selectedPolicies, setSelectedPolicies] = useState<PolicyData[]>([]);

    const isValid = useMemo(() => {
      return !Object.values(errors).some((error) => error.length);
    }, [errors]);

    const blocklistEntry = useMemo((): BlocklistEntry => {
      if (!item.entries.length) {
        return {
          field: ConditionEntryField.HASH,
          operator: 'included',
          type: 'match_any',
          value: [],
        };
      }
      return item.entries[0] as BlocklistEntry;
    }, [item.entries]);

    const selectedOs = useMemo((): OperatingSystem => {
      if (!item?.os_types?.length) {
        return OperatingSystem.WINDOWS;
      }

      return item.os_types[0] as OperatingSystem;
    }, [item?.os_types]);

    const selectedValues = useMemo(() => {
      return blocklistEntry.value.map((label) => ({ label }));
    }, [blocklistEntry.value]);

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () =>
        [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].map((os) => ({
          value: os,
          inputDisplay: OS_TITLES[os],
        })),
      []
    );

    const fieldOptions: Array<EuiSuperSelectOption<ConditionEntryField>> = useMemo(() => {
      const selectableFields: Array<EuiSuperSelectOption<ConditionEntryField>> = [
        ConditionEntryField.HASH,
        ConditionEntryField.PATH,
      ].map((field) => ({
        value: field,
        inputDisplay: CONDITION_FIELD_TITLE[field],
        dropdownDisplay: getDropdownDisplay(field),
      }));
      if (selectedOs === OperatingSystem.WINDOWS) {
        selectableFields.push({
          value: ConditionEntryField.SIGNER,
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER],
          dropdownDisplay: getDropdownDisplay(ConditionEntryField.SIGNER),
        });
      }

      return selectableFields;
    }, [selectedOs]);

    const validate = useCallback(
      (field: ConditionEntryField, os: OperatingSystem, type: 'match_any', values: string[]) => {
        if (!visited.value) {
          return isValid;
        }

        const newWarnings: React.ReactNode[] = [];
        const newErrors: React.ReactNode[] = [];

        // error if empty
        if (!values.length) {
          newErrors.push(createValidationMessage(ERRORS.VALUE_REQUIRED));
        }

        // error if invalid hash
        if (field === ConditionEntryField.HASH && values.some((value) => !isValidHash(value))) {
          newErrors.push(createValidationMessage(ERRORS.INVALID_HASH));
        }

        const isInvalidPath = values.some((value) => !isPathValid({ os, field, type, value }));

        // warn if invalid path
        if (field !== ConditionEntryField.HASH && isInvalidPath) {
          newWarnings.push(createValidationMessage(ERRORS.INVALID_PATH));
        }

        // warn if wildcard
        if (
          field !== ConditionEntryField.HASH &&
          !isInvalidPath &&
          values.some((value) => !hasSimpleExecutableName({ os, type, value }))
        ) {
          newWarnings.push(createValidationMessage(ERRORS.WILDCARD_PRESENT));
        }

        setWarnings((prevWarnings) => ({ ...prevWarnings, value: newWarnings }));
        setErrors((prevErrors) => ({ ...prevErrors, value: newErrors }));

        return isValid && !newErrors.length;
      },
      [visited, isValid]
    );

    const handleOnNameBlur = useCallback(() => {
      if (!item.name.trim()) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          name: [createValidationMessage(ERRORS.NAME_REQUIRED)],
        }));
      }
      setVisited((prevVisited) => ({ ...prevVisited, name: true }));
    }, [item.name]);

    const handleOnValuesFocus = useCallback(() => {
      setVisited((prevVisited) => ({ ...prevVisited, value: true }));
    }, []);

    const handleOnNameChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        const nameErrors: React.ReactNode[] = [];
        if (!name.trim()) {
          nameErrors.push(createValidationMessage(ERRORS.NAME_REQUIRED));
        }

        setErrors((prevErrors) => ({ ...prevErrors, name: nameErrors }));
        onChange({
          isValid: isValid && !nameErrors.length,
          item: {
            ...item,
            name,
          },
        });
      },
      [onChange, isValid, item]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange({
          isValid,
          item: {
            ...item,
            description: event.target.value,
          },
        });
      },
      [onChange, isValid, item]
    );

    const handleOnOsChange = useCallback(
      (os: OperatingSystem) => {
        const nextIsValid = validate(
          blocklistEntry.field,
          os,
          blocklistEntry.type,
          blocklistEntry.value
        );

        onChange({
          isValid: nextIsValid,
          item: {
            ...item,
            os_types: [os],
            entries: [
              {
                ...blocklistEntry,
                field:
                  os !== OperatingSystem.WINDOWS &&
                  blocklistEntry.field === ConditionEntryField.SIGNER
                    ? ConditionEntryField.HASH
                    : blocklistEntry.field,
              },
            ],
          },
        });
      },
      [validate, blocklistEntry, onChange, item]
    );

    const handleOnFieldChange = useCallback(
      (field: ConditionEntryField) => {
        const nextIsValid = validate(field, selectedOs, blocklistEntry.type, blocklistEntry.value);

        onChange({
          isValid: nextIsValid,
          item: {
            ...item,
            entries: [{ ...blocklistEntry, field }],
          },
        });
      },
      [validate, onChange, item, selectedOs, blocklistEntry]
    );

    // only triggered on remove / clear
    const handleOnValueChange = useCallback(
      (change: Array<EuiComboBoxOptionOption<string>>) => {
        const value = change.map((option) => option.label);

        const nextIsValid = validate(blocklistEntry.field, selectedOs, blocklistEntry.type, value);

        onChange({
          isValid: nextIsValid,
          item: {
            ...item,
            entries: [{ ...blocklistEntry, value }],
          },
        });
      },
      [validate, onChange, item, selectedOs, blocklistEntry]
    );

    const handleOnValueAdd = useCallback(
      (option: string) => {
        const splitValues = option.split(',').filter((value) => value.trim());
        const value = uniq([...blocklistEntry.value, ...splitValues]);

        const nextIsValid = validate(blocklistEntry.field, selectedOs, blocklistEntry.type, value);

        onChange({
          isValid: nextIsValid,
          item: {
            ...item,
            entries: [{ ...blocklistEntry, value }],
          },
        });
      },
      [validate, onChange, item, selectedOs, blocklistEntry]
    );

    const handleOnPolicyChange = useCallback(
      (change: EffectedPolicySelection) => {
        const tags = change.isGlobal
          ? [GLOBAL_ARTIFACT_TAG]
          : change.selected.map((policy) => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policy.id}`);

        setSelectedPolicies(change.selected);
        onChange({
          isValid,
          item: {
            ...item,
            tags,
          },
        });
      },
      [onChange, isValid, item]
    );

    return (
      <EuiForm component="div">
        <EuiTitle size="xs">
          <h3>{DETAILS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>{DETAILS_HEADER_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow
          label={NAME_LABEL}
          isInvalid={!!errors.name?.length}
          error={errors.name}
          fullWidth
        >
          <EuiFieldText
            name="name"
            value={item.name}
            onChange={handleOnNameChange}
            onBlur={handleOnNameBlur}
            required={visited.name}
            maxLength={256}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
          <EuiTextArea
            name="description"
            value={item.description}
            onChange={handleOnDescriptionChange}
            fullWidth
            compressed
            maxLength={256}
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        <EuiTitle size="xs">
          <h3>{CONDITIONS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>{CONDITIONS_HEADER_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow label={SELECT_OS_LABEL} fullWidth>
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={selectedOs}
            onChange={handleOnOsChange}
            fullWidth
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

        <EuiFormRow
          isInvalid={!!errors.value?.length}
          helpText={warnings.value}
          error={errors.value}
          fullWidth
        >
          <InputGroup>
            <InputItem gridArea="field">
              <EuiFormRow label={FIELD_LABEL} fullWidth>
                <EuiSuperSelect
                  name="field"
                  options={fieldOptions}
                  valueOfSelected={blocklistEntry.field}
                  onChange={handleOnFieldChange}
                  fullWidth
                />
              </EuiFormRow>
            </InputItem>
            <InputItem gridArea="operator">
              <EuiFormRow label={OPERATOR_LABEL} fullWidth>
                <EuiFieldText name="operator" value={isOneOfOperator.message} readOnly />
              </EuiFormRow>
            </InputItem>
            <InputItem gridArea="value">
              <EuiFormRow label={VALUE_LABEL} fullWidth>
                <EuiComboBox
                  selectedOptions={selectedValues}
                  onFocus={handleOnValuesFocus}
                  onChange={handleOnValueChange}
                  onCreateOption={handleOnValueAdd}
                  fullWidth
                  noSuggestions
                />
              </EuiFormRow>
            </InputItem>
          </InputGroup>
        </EuiFormRow>

        <>
          <EuiHorizontalRule />
          <EuiFormRow fullWidth>
            <EffectedPolicySelect
              isGlobal={isArtifactGlobal(item as ExceptionListItemSchema)}
              isPlatinumPlus={useLicense().isPlatinumPlus()}
              selected={selectedPolicies}
              options={policies}
              onChange={handleOnPolicyChange}
              isLoading={policiesIsLoading}
              description={POLICY_SELECT_DESCRIPTION}
            />
          </EuiFormRow>
        </>
      </EuiForm>
    );
  }
);
