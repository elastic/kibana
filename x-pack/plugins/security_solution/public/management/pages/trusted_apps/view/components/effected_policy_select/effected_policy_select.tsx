/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableProps,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { getPolicyDetailPath } from '../../../../../common/routing';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import { LinkToApp } from '../../../../../../common/components/endpoint/link_to_app';
import { useTestIdGenerator } from '../../../../../components/hooks/use_test_id_generator';

const NOOP = () => {};
const DEFAULT_LIST_PROPS: EuiSelectableProps['listProps'] = { bordered: true, showIcons: false };

const EffectivePolicyFormContainer = styled.div`
  .policy-name .euiSelectableListItem__text {
    text-decoration: none !important;
    color: ${(props) => props.theme.eui.euiTextColor} !important;
  }
`;

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
    const { getAppUrl } = useAppUrl();

    const getTestId = useTestIdGenerator(dataTestSubj);

    const toggleGlobal: EuiButtonGroupOptionProps[] = useMemo(
      () => [
        {
          id: 'globalPolicy',
          label: i18n.translate('xpack.securitySolution.endpoint.trustedAppsByPolicy.global', {
            defaultMessage: 'Global',
          }),
          iconType: isGlobal ? 'checkInCircleFilled' : '',
          'data-test-subj': getTestId('global'),
        },
        {
          id: 'perPolicy',
          label: i18n.translate('xpack.securitySolution.endpoint.trustedAppsByPolicy.perPolicy', {
            defaultMessage: 'Per Policy',
          }),
          iconType: !isGlobal ? 'checkInCircleFilled' : '',
          'data-test-subj': getTestId('perPolicy'),
        },
      ],
      [getTestId, isGlobal]
    );

    const selectableOptions: EffectedPolicyOption[] = useMemo(() => {
      const isPolicySelected = new Set<string>(selected.map((policy) => policy.id));

      return options
        .map<EffectedPolicyOption>((policy) => ({
          label: policy.name,
          className: 'policy-name',
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
              href={getAppUrl({ path: getPolicyDetailPath(policy.id) })}
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
    }, [getAppUrl, isGlobal, options, selected]);

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >(
      (currentOptions) => {
        onChange({
          isGlobal,
          selected: currentOptions.filter((opt) => opt.checked).map((opt) => opt.policy),
        });
      },
      [isGlobal, onChange]
    )!;

    const handleGlobalButtonChange = useCallback(
      (selectedId) => {
        onChange({
          isGlobal: selectedId === 'globalPolicy',
          selected,
        });
      },
      [onChange, selected]
    );

    const listBuilderCallback: EuiSelectableProps['children'] = useCallback((list, search) => {
      return (
        <>
          {search}
          {list}
        </>
      );
    }, []);

    return (
      <EffectivePolicyFormContainer>
        <EuiText size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.trustedapps.policySelect.assignmentSectionTitle"
              defaultMessage="Assignment"
            />
          </h3>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.securitySolution.trustedApps.assignmentSectionDescription', {
                  defaultMessage:
                    'You can assign this trusted application globally across all policies or assign it to specific policies.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow fullWidth>
              <EuiButtonGroup
                legend="Global Policy Toggle"
                options={toggleGlobal}
                idSelected={isGlobal ? 'globalPolicy' : 'perPolicy'}
                onChange={handleGlobalButtonChange}
                color="primary"
                isFullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {!isGlobal && (
          <EuiFormRow fullWidth>
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
        )}
      </EffectivePolicyFormContainer>
    );
  }
);

EffectedPolicySelect.displayName = 'EffectedPolicySelect';
