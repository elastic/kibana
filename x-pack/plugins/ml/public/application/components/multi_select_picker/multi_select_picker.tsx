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
import React, { FC, ReactNode, useEffect, useState } from 'react';

export interface Option {
  name?: string | ReactNode;
  value: string;
  checked?: 'on' | 'off';
  disabled?: boolean;
  type?: string;
  onChange?: (items: any[]) => void;
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

export const MultiselectPicker: FC<{
  options: Option[];
  onChange: Function;
  title?: string;
  checkedOptions: string[];
}> = ({ options, onChange, title, checkedOptions }) => {
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

  const handleOnChange = (index: number) => {
    if (!items[index] || !Array.isArray(checkedOptions) || onChange === undefined) {
      return;
    }
    const item = items[index];
    const foundIndex = checkedOptions.findIndex((fieldValue) => fieldValue === item.value);
    if (foundIndex > -1) {
      onChange(checkedOptions.filter((_, idx) => idx !== foundIndex));
    } else {
      onChange([...checkedOptions, item.value]);
    }
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={checkedOptions && checkedOptions.length > 0}
      numActiveFilters={checkedOptions && checkedOptions.length}
    >
      {title}
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
        <div style={{ maxHeight: 250, overflow: 'auto' }}>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item, index) => (
              <EuiFilterSelectItem
                checked={
                  checkedOptions &&
                  checkedOptions.findIndex((fieldValue) => fieldValue === item.value) > -1
                    ? 'on'
                    : undefined
                }
                key={index}
                onClick={() => handleOnChange(index)}
                style={{ flexDirection: 'row' }}
              >
                {item.name ?? item.value}
              </EuiFilterSelectItem>
            ))
          ) : (
            <NoFilterItems />
          )}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
