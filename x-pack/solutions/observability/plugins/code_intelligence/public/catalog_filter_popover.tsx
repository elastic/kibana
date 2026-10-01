/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  filter: string;
  title: string;
  options: ReadonlyArray<FilterOption<T>>;
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  searchable?: boolean;
  disabled?: boolean;
  width?: number;
}

export const CatalogFilterPopover = <T extends string>({
  filter,
  title,
  options,
  selected,
  onChange,
  searchable = false,
  disabled = false,
  width = 200,
}: Props<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectableOptions: Array<EuiSelectableOption<{ value: T }>> = options.map(
    ({ value, label }) => ({
      key: value,
      label,
      value,
      checked: selected.includes(value) ? 'on' : undefined,
      'data-test-subj': `codeIntelligence-${filter}-option-${value}`,
    })
  );

  const list = (
    <EuiSelectable<{ value: T }>
      aria-label={title}
      options={selectableOptions}
      onChange={(next) =>
        onChange(next.filter(({ checked }) => checked === 'on').map(({ value }) => value))
      }
      {...(searchable
        ? {
            searchable: true as const,
            searchProps: {
              placeholder: i18n.translate('xpack.codeIntelligence.catalog.filterSearch', {
                defaultMessage: 'Search',
              }),
              compressed: true,
            },
          }
        : {})}
      emptyMessage={i18n.translate('xpack.codeIntelligence.catalog.filterEmpty', {
        defaultMessage: 'No options available',
      })}
      noMatchesMessage={i18n.translate('xpack.codeIntelligence.catalog.filterNoMatches', {
        defaultMessage: 'No options match',
      })}
    >
      {(listElement, search) => (
        <div css={{ width }}>
          {search !== undefined && <EuiPopoverTitle>{search}</EuiPopoverTitle>}
          {listElement}
        </div>
      )}
    </EuiSelectable>
  );

  return (
    <EuiPopover
      ownFocus
      aria-label={title}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          isDisabled={disabled}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          numFilters={options.length}
          data-test-subj={`codeIntelligence-${filter}-filter-button`}
        >
          {title}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{ 'data-test-subj': `codeIntelligence-${filter}-filter-popover` }}
    >
      {list}
    </EuiPopover>
  );
};
