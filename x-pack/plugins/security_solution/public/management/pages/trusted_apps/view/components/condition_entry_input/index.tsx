/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler, memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiText,
} from '@elastic/eui';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import {
  TrustedAppConditionEntry,
  OperatorFieldIds,
} from '../../../../../../../common/endpoint/types';

import {
  CONDITION_FIELD_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  ENTRY_PROPERTY_TITLES,
  OPERATOR_TITLES,
} from '../../translations';
import { useTestIdGenerator } from '../../../../../components/hooks/use_test_id_generator';
import { getPlaceholderTextByOSType } from '../../../../../../../common/utils/path_placeholder';

const ConditionEntryCell = memo<{
  showLabel: boolean;
  label?: string;
  children: React.ReactElement;
}>(({ showLabel, label = '', children }) => {
  return showLabel ? (
    <EuiFormRow label={label} fullWidth>
      {children}
    </EuiFormRow>
  ) : (
    <>{children}</>
  );
});

ConditionEntryCell.displayName = 'ConditionEntryCell';

export interface ConditionEntryInputProps {
  os: OperatingSystem;
  entry: TrustedAppConditionEntry;
  /** controls if remove button is enabled/disabled */
  isRemoveDisabled?: boolean;
  /** If the labels for each Column in the input row should be shown. Normally set on the first row entry */
  showLabels: boolean;
  onRemove: (entry: TrustedAppConditionEntry) => void;
  onChange: (newEntry: TrustedAppConditionEntry, oldEntry: TrustedAppConditionEntry) => void;
  /**
   * invoked when at least one field in the entry was visited (triggered when `onBlur` DOM event is dispatched)
   * For this component, that will be triggered only when the `value` field is visited, since that is the
   * only one needs user input.
   */
  onVisited?: (entry: TrustedAppConditionEntry) => void;
  'data-test-subj'?: string;
}

// adding a style prop on EuiFlexGroup works only partially
// and for some odd reason garbles up gridTemplateAreas entry
const InputGroup = styled.div`
  display: grid;
  grid-template-columns: 25% 25% 45% 5%;
  grid-template-areas: 'field operator value remove';
`;

const InputItem = styled.div<{ gridArea: string }>`
  grid-area: ${({ gridArea }) => gridArea};
  align-self: center;
  margin: 4px;
  vertical-align: baseline;
`;

const operatorOptions = (Object.keys(OperatorFieldIds) as OperatorFieldIds[]).map((value) => ({
  dropdownDisplay: OPERATOR_TITLES[value],
  inputDisplay: OPERATOR_TITLES[value],
  value: value === 'matches' ? 'wildcard' : 'match',
}));

export const ConditionEntryInput = memo<ConditionEntryInputProps>(
  ({
    os,
    entry,
    showLabels = false,
    onRemove,
    onChange,
    isRemoveDisabled = false,
    onVisited,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [isVisited, setIsVisited] = useState(false);

    const fieldOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
      const getDropdownDisplay = (field: ConditionEntryField) => (
        <>
          {CONDITION_FIELD_TITLE[field]}
          <EuiText size="xs" color="subdued">
            {CONDITION_FIELD_DESCRIPTION[field]}
          </EuiText>
        </>
      );

      return [
        {
          dropdownDisplay: getDropdownDisplay(ConditionEntryField.HASH),
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.HASH],
          value: ConditionEntryField.HASH,
        },
        {
          dropdownDisplay: getDropdownDisplay(ConditionEntryField.PATH),
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.PATH],
          value: ConditionEntryField.PATH,
        },
        ...(os === OperatingSystem.WINDOWS
          ? [
              {
                dropdownDisplay: getDropdownDisplay(ConditionEntryField.SIGNER),
                inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER],
                value: ConditionEntryField.SIGNER,
              },
            ]
          : []),
      ];
    }, [os]);

    const handleValueUpdate = useCallback<ChangeEventHandler<HTMLInputElement>>(
      (ev) => onChange({ ...entry, value: ev.target.value }, entry),
      [entry, onChange]
    );

    const handleFieldUpdate = useCallback(
      (newField) => onChange({ ...entry, field: newField }, entry),
      [entry, onChange]
    );

    const handleOperatorUpdate = useCallback(
      (newOperator) => onChange({ ...entry, type: newOperator }, entry),
      [entry, onChange]
    );

    const handleRemoveClick = useCallback(() => onRemove(entry), [entry, onRemove]);

    const handleValueOnBlur = useCallback(() => {
      if (onVisited) {
        onVisited(entry);
      }
      if (!isVisited) {
        setIsVisited(true);
      }
    }, [entry, onVisited, isVisited]);

    return (
      <InputGroup data-test-subj={dataTestSubj}>
        <InputItem gridArea="field">
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.field}>
            <EuiSuperSelect
              options={fieldOptions}
              valueOfSelected={entry.field}
              onChange={handleFieldUpdate}
              data-test-subj={getTestId('field')}
            />
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="operator">
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.operator}>
            {entry.field === ConditionEntryField.PATH ? (
              <EuiSuperSelect
                options={operatorOptions}
                onChange={handleOperatorUpdate}
                valueOfSelected={entry.type}
                data-test-subj={getTestId('operator')}
              />
            ) : (
              <EuiFieldText
                name="operator"
                value={OPERATOR_TITLES.is}
                data-test-subj={getTestId('operator')}
                readOnly
              />
            )}
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="value">
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.value}>
            <EuiFieldText
              name="value"
              value={entry.value}
              placeholder={getPlaceholderTextByOSType({
                os,
                field: entry.field,
                type: entry.type,
              })}
              fullWidth
              required={isVisited}
              onChange={handleValueUpdate}
              onBlur={handleValueOnBlur}
              data-test-subj={getTestId('value')}
            />
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="remove">
          {/* Unicode `nbsp` is used below so that Remove button is property displayed */}
          <ConditionEntryCell showLabel={showLabels} label={'\u00A0'}>
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              onClick={handleRemoveClick}
              isDisabled={isRemoveDisabled}
              aria-label={i18n.translate(
                'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.removeLabel',
                { defaultMessage: 'Remove Entry' }
              )}
              data-test-subj={getTestId('remove')}
            />
          </ConditionEntryCell>
        </InputItem>
      </InputGroup>
    );
  }
);

ConditionEntryInput.displayName = 'ConditionEntryInput';
