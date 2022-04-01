/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, memo, useEffect, useRef } from 'react';
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
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import {
  OperatingSystem,
  BlocklistConditionEntryField,
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
  VALUE_LABEL_HELPER,
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
import { isValidHash } from '../../../../../../common/endpoint/service/artifacts/validations';
import { isArtifactGlobal } from '../../../../../../common/endpoint/service/artifacts';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import { isGlobalPolicyEffected } from '../../../../components/effected_policy_select/utils';

interface BlocklistEntry {
  field: BlocklistConditionEntryField;
  operator: 'included';
  type: 'match_any';
  value: string[];
}

type ERROR_KEYS = keyof typeof ERRORS;

type ItemValidationNodes = {
  [K in ERROR_KEYS]?: React.ReactNode;
};

interface ItemValidation {
  name: ItemValidationNodes;
  value: ItemValidationNodes;
}

function createValidationMessage(message: string): React.ReactNode {
  return <div>{message}</div>;
}

function getDropdownDisplay(field: BlocklistConditionEntryField): React.ReactNode {
  return (
    <>
      {CONDITION_FIELD_TITLE[field]}
      <EuiText size="xs" color="subdued">
        {CONDITION_FIELD_DESCRIPTION[field]}
      </EuiText>
    </>
  );
}

function isValid(itemValidation: ItemValidation): boolean {
  return !Object.values(itemValidation).some((errors) => Object.keys(errors).length);
}

export const BlockListForm = memo(
  ({ item, policies, policiesIsLoading, onChange, mode }: ArtifactFormComponentProps) => {
    const [visited, setVisited] = useState<{ name: boolean; value: boolean }>({
      name: false,
      value: false,
    });
    const warningsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const errorsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const [selectedPolicies, setSelectedPolicies] = useState<PolicyData[]>([]);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isGlobal = useMemo(() => isArtifactGlobal(item as ExceptionListItemSchema), [item]);
    const [wasByPolicy, setWasByPolicy] = useState(!isGlobalPolicyEffected(item.tags));
    const [hasFormChanged, setHasFormChanged] = useState(false);

    const showAssignmentSection = useMemo(() => {
      return (
        isPlatinumPlus ||
        (mode === 'edit' && (!isGlobal || (wasByPolicy && isGlobal && hasFormChanged)))
      );
    }, [mode, isGlobal, hasFormChanged, isPlatinumPlus, wasByPolicy]);

    // set initial state of `wasByPolicy` that checks if the initial state of the exception was by policy or not
    useEffect(() => {
      if (!hasFormChanged && item.tags) {
        setWasByPolicy(!isGlobalPolicyEffected(item.tags));
      }
    }, [item.tags, hasFormChanged]);

    // select policies if editing
    useEffect(() => {
      if (hasFormChanged) return;
      const policyIds = item.tags?.map((tag) => tag.split(':')[1]) ?? [];
      if (!policyIds.length) return;
      const policiesData = policies.filter((policy) => policyIds.includes(policy.id));

      setSelectedPolicies(policiesData);
    }, [hasFormChanged, item.tags, policies]);

    const blocklistEntry = useMemo((): BlocklistEntry => {
      if (!item.entries.length) {
        return {
          field: 'file.hash.*',
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

    const fieldOptions: Array<EuiSuperSelectOption<BlocklistConditionEntryField>> = useMemo(() => {
      const selectableFields: Array<EuiSuperSelectOption<BlocklistConditionEntryField>> = (
        ['file.hash.*', 'file.path'] as BlocklistConditionEntryField[]
      ).map((field) => ({
        value: field,
        inputDisplay: CONDITION_FIELD_TITLE[field],
        dropdownDisplay: getDropdownDisplay(field),
      }));
      if (selectedOs === OperatingSystem.WINDOWS) {
        selectableFields.push({
          value: 'file.Ext.code_signature',
          inputDisplay: CONDITION_FIELD_TITLE['file.Ext.code_signature'],
          dropdownDisplay: getDropdownDisplay('file.Ext.code_signature'),
        });
      }

      return selectableFields;
    }, [selectedOs]);

    const valueLabel = useMemo(() => {
      return (
        <div>
          <EuiToolTip content={VALUE_LABEL_HELPER}>
            <>
              {VALUE_LABEL} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
            </>
          </EuiToolTip>
        </div>
      );
    }, []);

    const validateValues = useCallback((nextItem: ArtifactFormComponentProps['item']) => {
      const os = ((nextItem.os_types ?? [])[0] as OperatingSystem) ?? OperatingSystem.WINDOWS;
      const {
        field = 'file.hash.*',
        type = 'match_any',
        value: values = [],
      } = (nextItem.entries[0] ?? {}) as BlocklistEntry;

      const newValueWarnings: ItemValidationNodes = {};
      const newNameErrors: ItemValidationNodes = {};
      const newValueErrors: ItemValidationNodes = {};

      // error if name empty
      if (!nextItem.name.trim()) {
        newNameErrors.NAME_REQUIRED = createValidationMessage(ERRORS.NAME_REQUIRED);
      }

      // error if no values
      if (!values.length) {
        newValueErrors.VALUE_REQUIRED = createValidationMessage(ERRORS.VALUE_REQUIRED);
      }

      // error if invalid hash
      if (field === 'file.hash.*' && values.some((value) => !isValidHash(value))) {
        newValueErrors.INVALID_HASH = createValidationMessage(ERRORS.INVALID_HASH);
      }

      const isInvalidPath = values.some((value) => !isPathValid({ os, field, type, value }));

      // warn if invalid path
      if (field !== 'file.hash.*' && isInvalidPath) {
        newValueWarnings.INVALID_PATH = createValidationMessage(ERRORS.INVALID_PATH);
      }

      // warn if wildcard
      if (
        field !== 'file.hash.*' &&
        !isInvalidPath &&
        values.some((value) => !hasSimpleExecutableName({ os, type, value }))
      ) {
        newValueWarnings.WILDCARD_PRESENT = createValidationMessage(ERRORS.WILDCARD_PRESENT);
      }

      // warn if duplicates
      if (values.length !== uniq(values).length) {
        newValueWarnings.DUPLICATE_VALUES = createValidationMessage(ERRORS.DUPLICATE_VALUES);
      }

      warningsRef.current = { ...warningsRef.current, value: newValueWarnings };
      errorsRef.current = { name: newNameErrors, value: newValueErrors };
    }, []);

    const handleOnNameBlur = useCallback(() => {
      validateValues(item);
      setVisited((prevVisited) => ({ ...prevVisited, name: true }));
    }, [item, validateValues]);

    const handleOnValueBlur = useCallback(() => {
      validateValues(item);
      setVisited((prevVisited) => ({ ...prevVisited, value: true }));
    }, [item, validateValues]);

    const handleOnNameChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextItem = {
          ...item,
          name: event.target.value,
        };

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextItem = {
          ...item,
          description: event.target.value,
        };
        validateValues(nextItem);

        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [onChange, item, validateValues]
    );

    const handleOnOsChange = useCallback(
      (os: OperatingSystem) => {
        const nextItem = {
          ...item,
          os_types: [os],
          entries: [
            {
              ...blocklistEntry,
              field:
                os !== OperatingSystem.WINDOWS && blocklistEntry.field === 'file.Ext.code_signature'
                  ? 'file.hash.*'
                  : blocklistEntry.field,
            },
          ],
        };

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, blocklistEntry, onChange, item]
    );

    const handleOnFieldChange = useCallback(
      (field: BlocklistConditionEntryField) => {
        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, field }],
        };

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const handleOnValueTextChange = useCallback(
      (value: string) => {
        const nextWarnings = { ...warningsRef.current.value };

        if (blocklistEntry.value.includes(value)) {
          nextWarnings.DUPLICATE_VALUE = createValidationMessage(ERRORS.DUPLICATE_VALUE);
        } else {
          delete nextWarnings.DUPLICATE_VALUE;
        }

        warningsRef.current = {
          ...warningsRef.current,
          value: nextWarnings,
        };

        // trigger re-render without modifying item
        setVisited((prevVisited) => ({ ...prevVisited }));
      },
      [blocklistEntry]
    );

    // only triggered on remove / clear
    const handleOnValueChange = useCallback(
      (change: Array<EuiComboBoxOptionOption<string>>) => {
        const value = change.map((option) => option.label);
        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, value }],
        };

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const handleOnValueAdd = useCallback(
      (option: string) => {
        const splitValues = option.split(',').filter((value) => value.trim());
        const value = [...blocklistEntry.value, ...splitValues];

        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, value }],
        };

        validateValues(nextItem);
        nextItem.entries[0].value = uniq(nextItem.entries[0].value);

        setVisited((prevVisited) => ({ ...prevVisited, value: true }));
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const handleOnPolicyChange = useCallback(
      (change: EffectedPolicySelection) => {
        const tags = change.isGlobal
          ? [GLOBAL_ARTIFACT_TAG]
          : change.selected.map((policy) => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policy.id}`);

        const nextItem = { ...item, tags };

        // Preserve old selected policies when switching to global
        if (!change.isGlobal) {
          setSelectedPolicies(change.selected);
        }
        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item]
    );

    return (
      <EuiForm component="div">
        <EuiTitle size="xs">
          <h3>{DETAILS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {mode === 'create' && (
          <EuiText size="s">
            <p>{DETAILS_HEADER_DESCRIPTION}</p>
          </EuiText>
        )}
        <EuiSpacer size="m" />

        <EuiFormRow
          label={NAME_LABEL}
          isInvalid={visited.name && !!Object.keys(errorsRef.current.name).length}
          error={Object.values(errorsRef.current.name)}
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

        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={1}>
              <EuiFormRow label={FIELD_LABEL} fullWidth>
                <EuiSuperSelect
                  name="field"
                  options={fieldOptions}
                  valueOfSelected={blocklistEntry.field}
                  onChange={handleOnFieldChange}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow label={OPERATOR_LABEL} fullWidth>
                <EuiFieldText name="operator" value={isOneOfOperator.message} readOnly />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={2} />
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow
          label={valueLabel}
          isInvalid={visited.value && !!Object.keys(errorsRef.current.value).length}
          helpText={Object.values(warningsRef.current.value)}
          error={Object.values(errorsRef.current.value)}
          fullWidth
        >
          <EuiComboBox
            selectedOptions={selectedValues}
            onBlur={handleOnValueBlur}
            onSearchChange={handleOnValueTextChange}
            onChange={handleOnValueChange}
            onCreateOption={handleOnValueAdd}
            fullWidth
            noSuggestions
          />
        </EuiFormRow>

        {showAssignmentSection && (
          <>
            <EuiHorizontalRule />
            <EuiFormRow fullWidth>
              <EffectedPolicySelect
                isGlobal={isGlobal}
                isPlatinumPlus={isPlatinumPlus}
                selected={selectedPolicies}
                options={policies}
                onChange={handleOnPolicyChange}
                isLoading={policiesIsLoading}
                description={POLICY_SELECT_DESCRIPTION}
              />
            </EuiFormRow>
          </>
        )}
      </EuiForm>
    );
  }
);
