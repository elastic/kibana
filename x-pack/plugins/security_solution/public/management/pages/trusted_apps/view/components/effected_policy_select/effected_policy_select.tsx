/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCheckbox,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableProps,
  EuiSwitch,
  EuiSwitchProps,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { FormattedMessage } from '@kbn/i18n/react';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { MANAGEMENT_APP_ID } from '../../../../../common/constants';
import { getPolicyDetailPath } from '../../../../../common/routing';
import { useFormatUrl } from '../../../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../../../common/constants';
import { LinkToApp } from '../../../../../../common/components/endpoint/link_to_app';

const NOOP = () => {};
const DEFAULT_LIST_PROPS: EuiSelectableProps['listProps'] = { bordered: true, showIcons: false };

interface OptionPolicyData {
  policy: PolicyData;
}

type EffectedPolicyOption = EuiSelectableOption<OptionPolicyData>;

export interface EffectedPolicySelection {
  isGlobal: boolean;
  selected: PolicyData[];
}

export type EffectedPolicySelectProps = Omit<
  EuiSelectableProps<OptionPolicyData>,
  'onChange' | 'options' | 'children' | 'searchable'
> & {
  options: PolicyData[];
  isGlobal: boolean;
  onChange: (selection: EffectedPolicySelection) => void;
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
    const { formatUrl } = useFormatUrl(SecurityPageName.administration);

    const [, setIsFirstRender] = useState<boolean>(true);
    const [selectionState, setSelectionState] = useState<EffectedPolicySelection>({
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
      const isPolicySelected = new Set<string>(selected.map((policy) => policy.id));

      return options
        .map<EffectedPolicyOption>((policy) => ({
          label: policy.name,
          prepend: (
            <EuiCheckbox
              id={htmlIdGenerator()()}
              onChange={NOOP}
              checked={isPolicySelected.has(policy.id)}
              disabled={isGlobal}
            />
          ),
          append: (
            <LinkToApp
              href={formatUrl(getPolicyDetailPath(policy.id))}
              appId={MANAGEMENT_APP_ID}
              appPath={getPolicyDetailPath(policy.id)}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.securitySolution.effectedPolicySelect.viewPolicyLinkLabel"
                defaultMessage="View policy"
              />
            </LinkToApp>
          ),
          policy,
          checked: isPolicySelected.has(policy.id) ? 'on' : undefined,
          disabled: isGlobal,
          'data-test-subj': `policy-${policy.id}`,
        }))
        .sort(({ label: labelA }, { label: labelB }) => labelA.localeCompare(labelB));
    }, [formatUrl, isGlobal, options, selected]);

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >((currentOptions) => {
      setSelectionState((prevState) => ({
        ...prevState,
        selected: currentOptions.filter((opt) => opt.checked).map((opt) => opt.policy),
      }));
    }, [])!;

    const handleGlobalSwitchChange: EuiSwitchProps['onChange'] = useCallback(
      ({ target: { checked } }) => {
        setSelectionState((prevState) => ({ ...prevState, isGlobal: checked }));
      },
      []
    );

    const listBuilderCallback: EuiSelectableProps['children'] = useCallback((list, search) => {
      return (
        <>
          {search}
          {list}
        </>
      );
    }, []);

    // Anytime selection state is updated, call `onChange`, but not on first render
    useEffect(() => {
      setIsFirstRender((isFirstRender) => {
        if (isFirstRender) {
          return false;
        }
        onChange(selectionState);
        return false;
      });
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
            searchable={true}
            data-test-subj={getTestId('policiesSelectable')}
          >
            {listBuilderCallback}
          </EuiSelectable>
        </EuiFormRow>
      </>
    );
  }
);

EffectedPolicySelect.displayName = 'EffectedPolicySelect';
