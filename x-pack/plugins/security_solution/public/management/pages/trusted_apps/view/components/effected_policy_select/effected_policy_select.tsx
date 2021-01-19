/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFormRow,
  EuiSelectable,
  EuiSelectableProps,
  EuiSwitch,
  EuiSwitchProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { PolicyData } from '../../../../../../../common/endpoint/types';

interface OptionPolicyData {
  policy: PolicyData;
}

type EffectedPolicyOption = EuiSelectableOption<OptionPolicyData>;

interface EffectedPolicySelectionState {
  isGlobal: boolean;
  selected: PolicyData[];
}

export type EffectedPolicySelectProps = Omit<
  EuiSelectableProps,
  'onChange' | 'options' | 'children'
> & {
  options: PolicyData[];
  isGlobal: boolean;
  onChange: (selection: EffectedPolicySelectionState) => void;
  selected?: PolicyData[];
};
export const EffectedPolicySelect = memo<EffectedPolicySelectProps>(
  ({
    isGlobal,
    onChange,
    listProps,
    options,
    selected = [],
    'data-test-subj': dataTestSubj,
    ...otherSelectableProps
  }) => {
    const DEFAULT_LIST_PROPS = useMemo(() => ({ bordered: true }), []);

    const [selectionState, setSelectionState] = useState<EffectedPolicySelectionState>({
      isGlobal,
      selected,
    });

    const getTestId = useCallback(
      (suffix): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );

    const selectableOptions: EffectedPolicyOption[] = useMemo(() => {
      const isPolicySelected = selected.reduce<{ [K: string]: PolicyData }>(
        (idToPolicyData, policy) => {
          idToPolicyData[policy.id] = policy;
          return idToPolicyData;
        },
        {}
      );

      return options
        .map<EffectedPolicyOption>((policy) => ({
          label: policy.name,
          policy,
          checked: isPolicySelected[policy.id] ? 'on' : undefined,
          disabled: isGlobal,
        }))
        .sort(({ label: labelA }, { label: labelB }) => labelA.localeCompare(labelB));
    }, [isGlobal, options, selected]);

    const handleOnPolicySelectChange: EuiSelectableProps<OptionPolicyData>['onChange'] = useCallback(
      (currentOptions) => {
        setSelectionState((prevState) => ({
          ...prevState,
          selected: currentOptions.filter((opt) => opt.checked).map((opt) => opt.policy),
        }));
      },
      []
    );

    const handleGlobalSwitchChange: EuiSwitchProps['onChange'] = useCallback(
      ({ target: { checked } }) => {
        setSelectionState((prevState) => ({ ...prevState, isGlobal: checked }));
      },
      []
    );

    const listBuilderCallback: EuiSelectableProps['children'] = useCallback((list) => list, []);

    // Anytime selection state is updated, call `onChange`
    useEffect(() => {
      onChange(selectionState);
    }, [onChange, selectionState]);

    return (
      <>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.securitySolution.trustedapps.policySelect.globalSectionTitle',
            {
              defaultMessage: 'Global application',
            }
          )}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.policySelect.globalSwitchTitle',
              {
                defaultMessage: 'Apply trusted application globally',
              }
            )}
            checked={selectionState.isGlobal}
            onChange={handleGlobalSwitchChange}
            data-test-subj={getTestId('globalSwitch')}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.securitySolution.policySelect.policySpecificSectionTitle', {
            defaultMessage: 'Apply to specific endpoint policies',
          })}
        >
          <EuiSelectable<OptionPolicyData>
            {...otherSelectableProps}
            options={selectableOptions}
            listProps={listProps || DEFAULT_LIST_PROPS}
            onChange={handleOnPolicySelectChange}
            data-test-subj={getTestId('policiesSelectable')}
          >
            {listBuilderCallback}
          </EuiSelectable>
        </EuiFormRow>
      </>
    );
  }
);

EffectedPolicySelect.displayName = 'PolicySelect';
