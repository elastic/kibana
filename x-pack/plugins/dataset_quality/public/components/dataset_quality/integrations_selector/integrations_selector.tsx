/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function IntegrationsSelector() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [items, setItems] = useState<
    Array<{ label: string; checked?: EuiSelectableOptionCheckedType }>
  >([
    { label: 'Johann Sebastian Bach', checked: 'on' },
    { label: 'Wolfgang Amadeus Mozart', checked: 'on' },
    { label: 'Antonín Dvořák', checked: 'off' },
    { label: 'Dmitri Shostakovich' },
    { label: 'Felix Mendelssohn-Bartholdy' },
    { label: 'Franz Liszt' },
    { label: 'Franz Schubert' },
    { label: 'Frédéric Chopin' },
    { label: 'Georg Friedrich Händel' },
    { label: 'Giuseppe Verdi' },
    { label: 'Gustav Mahler' },
    { label: 'Igor Stravinsky' },
    { label: 'Johannes Brahms' },
    { label: 'Joseph Haydn' },
    { label: 'Ludwig van Beethoven' },
    { label: 'Piotr Illitch Tchaïkovsky' },
    { label: 'Robert Schumann' },
    { label: 'Sergej S. Prokofiew' },
  ]);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={items.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      Composers
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
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
          onChange={(newOptions) => setItems(newOptions)}
          isLoading={false}
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
    </EuiFilterGroup>
  );
}
