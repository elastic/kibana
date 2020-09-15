/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEventHandler, memo, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiFieldText,
  EuiButtonIcon,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';

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

export interface ConditionEntryProps {
  // FIXME:PT probably need to adjust below types to match what is done in `TrustedApp` type
  os: TrustedApp['os'];
  entry: TrustedApp['entries'][0];
  /** controls if remove button is enabled/disabled */
  isRemoveDisabled?: boolean;
  /** If the labels for each Column in the input row should be shown. Normally set on the first row entry */
  showLabels: boolean;
  onRemove: (entry: TrustedApp['entries'][0]) => void;
  onChange: (newEntry: TrustedApp['entries'][0], oldEntry: TrustedApp['entries'][0]) => void;
  'data-test-subj'?: string;
}
export const ConditionEntry = memo<ConditionEntryProps>(
  ({
    entry,
    showLabels = false,
    onRemove,
    onChange,
    isRemoveDisabled = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useCallback(
      (suffix: string): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    const fieldOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
      return [
        {
          inputDisplay: i18n.translate(
            'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.hash',
            { defaultMessage: 'Hash' }
          ),
          value: 'process.hash.*',
        },
        {
          inputDisplay: i18n.translate(
            'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.path',
            { defaultMessage: 'Path' }
          ),
          value: 'process.path',
        },
      ];
    }, []);
    const handleValueUpdate = useCallback<ChangeEventHandler<HTMLInputElement>>(
      (ev) => {
        onChange(
          {
            ...entry,
            value: ev.target.value,
          },
          entry
        );
      },
      [entry, onChange]
    );
    const handleFieldUpdate = useCallback(
      (newField) => {
        onChange(
          {
            ...entry,
            field: newField,
          },
          entry
        );
      },
      [entry, onChange]
    );
    const handleRemoveClick = useCallback(() => {
      onRemove(entry);
    }, [entry, onRemove]);

    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        direction="row"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={2}>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field',
              { defaultMessage: 'Field' }
            )}
          >
            <EuiSuperSelect
              options={fieldOptions}
              valueOfSelected={entry.field}
              onChange={handleFieldUpdate}
              data-test-subj={getTestId('field')}
            />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.operator',
              { defaultMessage: 'Operator' }
            )}
          >
            <EuiFieldText
              name="operator"
              value={i18n.translate(
                'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.operator.is',
                { defaultMessage: 'is' }
              )}
              readOnly
            />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.value',
              { defaultMessage: 'Value' }
            )}
          >
            <EuiFieldText
              name="value"
              value={entry.value}
              onChange={handleValueUpdate}
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
            />
          </ConditionEntryCell>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConditionEntry.displayName = 'ConditionEntry';
