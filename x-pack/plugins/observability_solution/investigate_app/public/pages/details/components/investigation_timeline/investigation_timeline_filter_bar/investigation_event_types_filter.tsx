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
  EuiSelectableOption,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface Props {
  onSelected: (eventTypes: string[]) => void;
}

export function InvestigationEventTypesFilter({ onSelected }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [items, setItems] = useState<EuiSelectableOption[]>([
    {
      key: 'alert',
      label: i18n.translate('xpack.investigateApp.investigationEventTypesFilter.alertLabel', {
        defaultMessage: 'Alert',
      }),
      checked: 'on',
    },
    {
      key: 'annotation',
      label: i18n.translate('xpack.investigateApp.investigationEventTypesFilter.annotationLabel', {
        defaultMessage: 'Annotation',
      }),
      checked: 'on',
    },
  ]);

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });

  const handleChange = (newOptions: EuiSelectableOption[]) => {
    setItems(newOptions);

    const selected = newOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.key!);
    onSelected(selected);
  };

  const button = (
    <EuiFilterButton
      grow={false}
      iconType="arrowDown"
      badgeColor="success"
      onClick={togglePopover}
      isSelected={isPopoverOpen}
      numFilters={items.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      {i18n.translate(
        'xpack.investigateApp.investigationEventTypesFilter.filtersFilterButtonLabel',
        { defaultMessage: 'Filters' }
      )}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterGroupPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable options={items} onChange={handleChange}>
          {(list) => (
            <div style={{ width: 200 }}>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate(
                  'xpack.investigateApp.investigationEventTypesFilter.filterEventTypePopoverTitleLabel',
                  { defaultMessage: 'Filter event type' }
                )}
              </EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}
