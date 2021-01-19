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
  ({ isGlobal, onChange, listProps, options, selected = [], ...otherSelectableProps }) => {
    const DEFAULT_LIST_PROPS = useMemo(() => ({ bordered: true }), []);

    const [selectionState, setSelectionState] = useState<EffectedPolicySelectionState>({
      isGlobal,
      selected,
    });

    const selectableOptions: EffectedPolicyOption[] = useMemo(() => {
      // FIXME:PT temporary for testing only
      const tempOptions = Array.from({ length: 30 }, (_, i) => ({
        name: `policy ${i + 1}`,
      }));
      options;
      return tempOptions.map((policy) => ({ label: policy.name, policy }));
    }, [options]);

    const handleOnPolicySelectChange: EuiSelectableProps['onChange'] = useCallback(
      (changedOptions) => {
        console.log('handleOnPolicySelectChange triggered');
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
          >
            {listBuilderCallback}
          </EuiSelectable>
        </EuiFormRow>
      </>
    );
  }
);

EffectedPolicySelect.displayName = 'PolicySelect';
