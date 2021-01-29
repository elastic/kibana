/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEventHandler, memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';

import {
  ConditionEntry,
  ConditionEntryField,
  OperatingSystem,
} from '../../../../../../../common/endpoint/types';

import { CONDITION_FIELD_TITLE, ENTRY_PROPERTY_TITLES, OPERATOR_TITLE } from '../../translations';

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
  entry: ConditionEntry;
  /** controls if remove button is enabled/disabled */
  isRemoveDisabled?: boolean;
  /** If the labels for each Column in the input row should be shown. Normally set on the first row entry */
  showLabels: boolean;
  onRemove: (entry: ConditionEntry) => void;
  onChange: (newEntry: ConditionEntry, oldEntry: ConditionEntry) => void;
  /**
   * invoked when at least one field in the entry was visited (triggered when `onBlur` DOM event is dispatched)
   * For this component, that will be triggered only when the `value` field is visited, since that is the
   * only one needs user input.
   */
  onVisited?: (entry: ConditionEntry) => void;
  'data-test-subj'?: string;
}

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
    const getTestId = useCallback((suffix: string) => dataTestSubj && `${dataTestSubj}-${suffix}`, [
      dataTestSubj,
    ]);

    const fieldOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
      return [
        {
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.HASH],
          value: ConditionEntryField.HASH,
        },
        {
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.PATH],
          value: ConditionEntryField.PATH,
        },
        ...(os === OperatingSystem.WINDOWS
          ? [
              {
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

    const handleRemoveClick = useCallback(() => onRemove(entry), [entry, onRemove]);

    const handleValueOnBlur = useCallback(() => {
      if (onVisited) {
        onVisited(entry);
      }
    }, [entry, onVisited]);

    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        direction="row"
        data-test-subj={dataTestSubj}
        responsive={false}
      >
        <EuiFlexItem grow={2}>
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.field}>
            <EuiSuperSelect
              options={fieldOptions}
              valueOfSelected={entry.field}
              onChange={handleFieldUpdate}
              data-test-subj={getTestId('field')}
            />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.operator}>
            <EuiFieldText name="operator" value={OPERATOR_TITLE.included} readOnly />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.value}>
            <EuiFieldText
              name="value"
              value={entry.value}
              fullWidth
              required
              onChange={handleValueUpdate}
              onBlur={handleValueOnBlur}
              data-test-subj={getTestId('value')}
            />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConditionEntryInput.displayName = 'ConditionEntryInput';
