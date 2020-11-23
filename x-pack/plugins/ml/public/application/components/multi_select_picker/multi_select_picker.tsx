/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';
import React, { FC, useEffect, useState } from 'react';

export interface Option {
  name: string;
  checked?: 'on' | 'off';
  disabled?: boolean;
}

const NoFilterItems = () => {
  return (
    <div className="euiFilterSelect__note">
      <div className="euiFilterSelect__noteContent">
        <EuiIcon type="minusInCircle" />
        <EuiSpacer size="xs" />
        <p>No filters found</p>
      </div>
    </div>
  );
};

export const MultiselectPicker: FC<{ options: Option[]; onChange: Function }> = ({
  options,
  onChange,
}) => {
  const [items, setItems] = useState<Option[]>(options);

  useEffect(() => {
    setItems(options);
  }, [options]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  function updateItem(index: number) {
    if (!items[index]) {
      return;
    }

    const newItems = [...items];

    switch (newItems[index].checked) {
      case 'on':
        delete newItems[index].checked;
        break;

      case 'off':
        newItems[index].checked = undefined;
        break;

      default:
        newItems[index].checked = 'on';
    }

    setItems(newItems);
  }

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      Field name
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id="popoverExampleMultiSelect"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiPopoverTitle paddingSize="s">
          <EuiFieldSearch compressed />
        </EuiPopoverTitle>
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item, index) => (
            <EuiFilterSelectItem
              checked={item.checked}
              key={index}
              onClick={() => updateItem(index)}
            >
              {item.name}
            </EuiFilterSelectItem>
          ))
        ) : (
          <NoFilterItems />
        )}
      </EuiPopover>
    </EuiFilterGroup>
  );
};
