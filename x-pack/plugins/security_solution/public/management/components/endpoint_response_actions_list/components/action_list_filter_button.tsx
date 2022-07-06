/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiFilterButton,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ResponseActions } from '../../../../../common/endpoint/types';

type CommandFilterItems = Array<{
  key: ResponseActions;
  label: string;
  checked: 'on' | 'off' | undefined;
}>;
export const ActionListFilterButton = memo(
  ({
    filterName,
    filterItems,
    onChangeCommand,
  }: {
    filterName: string;
    filterItems: ResponseActions[];
    onChangeCommand: (selectedCommands: ResponseActions[]) => void;
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onButtonClick = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [setIsPopoverOpen, isPopoverOpen]);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);
    const filterGroupPopoverId = useGeneratedHtmlId({
      prefix: 'filterGroupPopover',
    });

    const [items, setItems] = useState<CommandFilterItems>(
      filterItems.map((filter) => ({
        key: filter,
        label: filter === 'unisolate' ? 'release' : filter,
        checked: undefined,
      }))
    );

    const button = (
      <EuiFilterButton
        iconType="arrowDown"
        onClick={onButtonClick}
        isSelected={isPopoverOpen}
        numFilters={items.filter((item) => item.checked !== 'on').length}
        hasActiveFilters={!!items.find((item) => item.checked === 'on')}
        numActiveFilters={items.filter((item) => item.checked === 'on').length}
      >
        {filterName}
      </EuiFilterButton>
    );

    const onChangeCallback = useCallback(
      (newOptions: CommandFilterItems) => {
        // don't do the intermediate x state, just check or no check
        setItems(newOptions.map((e) => (e.checked === 'off' ? { ...e, checked: undefined } : e)));
        const selectedCommands = newOptions.reduce<ResponseActions[]>((acc, curr) => {
          if (curr.checked === 'on') {
            acc.push(curr.key);
          }
          return acc;
        }, []);
        onChangeCommand(selectedCommands);
      },
      [onChangeCommand]
    );

    return (
      <EuiPopover
        id={filterGroupPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable
          allowExclusions
          searchable
          searchProps={{
            placeholder: 'Filter list',
            compressed: true,
          }}
          aria-label="Composers"
          options={items}
          onChange={onChangeCallback}
          loadingMessage="Loading filters"
          emptyMessage="No filters available"
          noMatchesMessage="No filters found"
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

ActionListFilterButton.displayName = 'ActionListFilterButton';
