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
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { PolicyData } from '../../../../common/endpoint/types';
import { LinkToApp } from '../../../common/components/endpoint/link_to_app';
import { getPolicyDetailPath } from '../../common/routing';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { useAppUrl } from '../../../common/lib/kibana/hooks';
import { Loader } from '../../../common/components/loader';

const NOOP = () => {};
const DEFAULT_LIST_PROPS: EuiSelectableProps['listProps'] = { bordered: true, showIcons: false };
const SEARCH_PROPS = { className: 'effected-policies-search' };

const StyledEuiSelectable = styled.div`
  .effected-policies-search {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .euiSelectableList {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top-width: 0;
  }
`;

const StyledEuiFlexItemButtonGroup = styled(EuiFlexItem)`
  @media only screen and (max-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    align-items: center;
  }
`;

const StyledButtonGroup = styled(EuiButtonGroup)`
  display: flex;
  justify-content: right;
  .euiButtonGroupButton {
    padding-right: ${(props) => props.theme.eui.paddingSizes.l};
  }
`;

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
  isPlatinumPlus: boolean;
  description?: string;
  onChange: (selection: EffectedPolicySelection) => void;
  selected?: PolicyData[];
};
export const EffectedPolicySelect = memo<EffectedPolicySelectProps>(
  ({
    isGlobal,
    isPlatinumPlus,
    description,
    isLoading = false,
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
          label: i18n.translate('xpack.securitySolution.endpoint.effectedPolicySelect.global', {
            defaultMessage: 'Global',
          }),
          iconType: isGlobal ? 'checkInCircleFilled' : 'empty',
          'data-test-subj': getTestId('global'),
        },
        {
          id: 'perPolicy',
          label: i18n.translate('xpack.securitySolution.endpoint.effectedPolicySelect.perPolicy', {
            defaultMessage: 'Per Policy',
          }),
          iconType: !isGlobal ? 'checkInCircleFilled' : 'empty',
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
              disabled={isGlobal || !isPlatinumPlus}
              data-test-subj={`policy-${policy.id}-checkbox`}
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
          disabled: isGlobal || !isPlatinumPlus,
          'data-test-subj': `policy-${policy.id}`,
        }))
        .sort(({ label: labelA }, { label: labelB }) => labelA.localeCompare(labelB));
    }, [getAppUrl, isGlobal, isPlatinumPlus, options, selected]);

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
    );

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
              id="xpack.securitySolution.effectedPolicySelect.assignmentSectionTitle"
              defaultMessage="Assignment"
            />
          </h3>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiText size="s">
              <p>
                {description
                  ? description
                  : i18n.translate(
                      'xpack.securitySolution.effectedPolicySelect.assignmentSectionDescription',
                      {
                        defaultMessage:
                          'Assign globally across all policies, or assign it to specific policies.',
                      }
                    )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <StyledEuiFlexItemButtonGroup grow={1}>
            <EuiFormRow fullWidth>
              <StyledButtonGroup
                legend="Global Policy Toggle"
                options={toggleGlobal}
                idSelected={isGlobal ? 'globalPolicy' : 'perPolicy'}
                onChange={handleGlobalButtonChange}
                color="primary"
                data-test-subj={getTestId('byPolicyGlobalButtonGroup')}
              />
            </EuiFormRow>
          </StyledEuiFlexItemButtonGroup>
        </EuiFlexGroup>
        <EuiSpacer />
        {!isGlobal &&
          (isLoading ? (
            <Loader size="l" data-test-subj={getTestId('policiesLoader')} />
          ) : (
            <EuiFormRow fullWidth>
              <StyledEuiSelectable>
                <EuiSelectable<OptionPolicyData>
                  {...otherSelectableProps}
                  options={selectableOptions}
                  listProps={listProps || DEFAULT_LIST_PROPS}
                  onChange={handleOnPolicySelectChange}
                  searchProps={SEARCH_PROPS}
                  searchable={true}
                  data-test-subj={getTestId('policiesSelectable')}
                >
                  {listBuilderCallback}
                </EuiSelectable>
              </StyledEuiSelectable>
            </EuiFormRow>
          ))}
      </EffectivePolicyFormContainer>
    );
  }
);

EffectedPolicySelect.displayName = 'EffectedPolicySelect';
