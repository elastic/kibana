/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState, useEffect, ChangeEvent } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterSelectItem,
  FilterChecked,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ImmutableArray, PolicyData } from '../../../../common/endpoint/types';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export interface PoliciesSelectorProps {
  policies: ImmutableArray<PolicyData>;
  defaultIncludedPolicies?: string;
  defaultExcludedPolicies?: string;
  onChangeSelection: (items: PolicySelectionItem[]) => void;
}

export interface PolicySelectionItem {
  name: string;
  id?: string;
  checked?: FilterChecked;
}

interface DefaultPoliciesByKey {
  [key: string]: boolean;
}

const GLOBAL_ENTRIES = i18n.translate(
  'xpack.securitySolution.management.policiesSelector.globalEntries',
  {
    defaultMessage: 'Global entries',
  }
);
const UNASSIGNED_ENTRIES = i18n.translate(
  'xpack.securitySolution.management.policiesSelector.unassignedEntries',
  {
    defaultMessage: 'Unassigned entries',
  }
);

export const PoliciesSelector = memo<PoliciesSelectorProps>(
  ({ policies, onChangeSelection, defaultExcludedPolicies, defaultIncludedPolicies }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [query, setQuery] = useState<string>('');
    const [itemsList, setItemsList] = useState<PolicySelectionItem[]>([]);

    const isExcludePoliciesInFilterEnabled = useIsExperimentalFeatureEnabled(
      'excludePoliciesInFilterEnabled'
    );

    useEffect(() => {
      const defaultIncludedPoliciesByKey: DefaultPoliciesByKey = defaultIncludedPolicies
        ? defaultIncludedPolicies.split(',').reduce((acc, val) => ({ ...acc, [val]: true }), {})
        : {};

      const defaultExcludedPoliciesByKey: DefaultPoliciesByKey = defaultExcludedPolicies
        ? defaultExcludedPolicies.split(',').reduce((acc, val) => ({ ...acc, [val]: true }), {})
        : {};

      const getCheckedValue = (id: string): FilterChecked | undefined =>
        defaultIncludedPoliciesByKey[id]
          ? 'on'
          : defaultExcludedPoliciesByKey[id]
          ? 'off'
          : undefined;

      setItemsList([
        ...policies.map((policy) => ({
          name: policy.name,
          id: policy.id,
          checked: getCheckedValue(policy.id),
        })),
        { name: GLOBAL_ENTRIES, id: 'global', checked: getCheckedValue('global') },
        { name: UNASSIGNED_ENTRIES, id: 'unassigned', checked: getCheckedValue('unassigned') },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [policies]);

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
    }, []);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const onChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
      const value = ev.target.value || '';
      setQuery(value);
    }, []);

    const updateItem = useCallback(
      (index: number) => {
        if (!itemsList[index]) {
          return;
        }

        const newItems = [...itemsList];

        switch (newItems[index].checked) {
          case 'on':
            newItems[index].checked = isExcludePoliciesInFilterEnabled ? 'off' : undefined;
            break;

          case 'off':
            newItems[index].checked = undefined;
            break;

          default:
            newItems[index].checked = 'on';
        }

        setItemsList(newItems);
        onChangeSelection(newItems);
      },
      [itemsList, onChangeSelection, isExcludePoliciesInFilterEnabled]
    );

    const dropdownItems = useMemo(
      () =>
        itemsList.map((item, index) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ? (
            <EuiFilterSelectItem
              checked={item.checked}
              key={index}
              onClick={() => updateItem(index)}
              data-test-subj={`policiesSelector-popover-items-${item.id}`}
            >
              {item.name}
            </EuiFilterSelectItem>
          ) : null
        ),
      [itemsList, query, updateItem]
    );

    const button = useMemo(
      () => (
        <EuiFilterButton
          iconType="arrowDown"
          data-test-subj="policiesSelectorButton"
          onClick={onButtonClick}
          isSelected={isPopoverOpen}
          numFilters={itemsList.length}
          hasActiveFilters={!!itemsList.find((item) => item.checked === 'on')}
          numActiveFilters={itemsList.filter((item) => item.checked === 'on').length}
        >
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.management.policiesSelector.label"
              defaultMessage="Policies"
            />
          </EuiText>
        </EuiFilterButton>
      ),
      [isPopoverOpen, itemsList, onButtonClick]
    );

    return (
      <EuiFlexGroup
        data-test-subj="policiesSelector"
        direction="row"
        alignItems="center"
        gutterSize="l"
      >
        <EuiFlexItem>
          <EuiFilterGroup>
            <EuiPopover
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
            >
              <EuiPopoverTitle paddingSize="s">
                <EuiFieldSearch
                  data-test-subj="policiesSelectorSearch"
                  compressed
                  onChange={onChange}
                  value={query}
                />
              </EuiPopoverTitle>
              <div data-test-subj="policiesSelector-popover" className="euiFilterSelect__items">
                {dropdownItems}
              </div>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

PoliciesSelector.displayName = 'PoliciesSelector';
