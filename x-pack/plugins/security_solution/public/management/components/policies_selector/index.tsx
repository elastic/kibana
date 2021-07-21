/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState, useEffect, ChangeEvent } from 'react';

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
} from '@elastic/eui';
import { ImmutableArray, PolicyData } from '../../../../common/endpoint/types';

export interface PoliciesSelectorProps {
  policies: ImmutableArray<PolicyData>;
  defaultIncludedPolicies?: string;
  defaultExcludedPolicies?: string;
  onChangeSelection: (items: Item[]) => void;
}

export interface Item {
  name: string;
  id?: string;
  checked?: FilterChecked;
}

interface DefaultPoliciesByKey {
  [key: string]: boolean;
}

export const PoliciesSelector = memo<PoliciesSelectorProps>(
  ({ policies, onChangeSelection, defaultExcludedPolicies, defaultIncludedPolicies }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [query, setQuery] = useState<string>('');
    const [itemsList, setItemsList] = useState<Item[]>([]);

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
        { name: 'Global entries', id: 'global', checked: getCheckedValue('global') },
        { name: 'Unassigned entries', id: 'unassigned', checked: getCheckedValue('unassigned') },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [policies]);

    const onButtonClick = () => {
      setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
    };

    const closePopover = () => {
      setIsPopoverOpen(false);
    };

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
            newItems[index].checked = 'off';
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
      [itemsList, onChangeSelection]
    );

    const dropdownItems = useMemo(
      () =>
        itemsList.map((item, index) =>
          item.name.match(new RegExp(query, 'i')) ? (
            <EuiFilterSelectItem
              checked={item.checked}
              key={index}
              onClick={() => updateItem(index)}
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
          onClick={onButtonClick}
          isSelected={isPopoverOpen}
          numFilters={itemsList.length}
          hasActiveFilters={!!itemsList.find((item) => item.checked === 'on')}
          numActiveFilters={itemsList.filter((item) => item.checked === 'on').length}
        >
          {'Policies'}
        </EuiFilterButton>
      ),
      [isPopoverOpen, itemsList]
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
                <EuiFieldSearch compressed onChange={onChange} />
              </EuiPopoverTitle>
              <div className="euiFilterSelect__items">{dropdownItems}</div>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

PoliciesSelector.displayName = 'PoliciesSelector';
