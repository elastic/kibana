/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, EuiTitle } from '@elastic/eui';

export interface TypeFilterProps {
  options: Array<{
    groupName: string;
    subOptions: Array<{
      value: string;
      name: string;
    }>;
  }>;
  onChange: (selectedTags: string[]) => void;
  filters: string[];
}

export const TypeFilter: React.FunctionComponent<TypeFilterProps> = ({
  options,
  onChange: onFilterChange,
  filters,
}: TypeFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          hasActiveFilters={filters.length > 0}
          numActiveFilters={filters.length}
          numFilters={filters.length}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj="ruleTypeFilterButton"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.typeFilterLabel"
            defaultMessage="Type"
          />
        </EuiFilterButton>
      }
    >
      <div className="euiFilterSelect__items">
        {options.map((groupItem, groupIndex) => (
          <Fragment key={`group${groupIndex}`}>
            <EuiTitle data-test-subj={`ruleType${groupIndex}Group`} size="xxs">
              <h3>{groupItem.groupName}</h3>
            </EuiTitle>
            {groupItem.subOptions.map((item, index) => (
              <EuiFilterSelectItem
                key={index}
                onClick={() => {
                  const isPreviouslyChecked = filters.includes(item.value);
                  if (isPreviouslyChecked) {
                    onFilterChange(filters.filter((val) => val !== item.value));
                  } else {
                    onFilterChange(filters.concat(item.value));
                  }
                }}
                checked={filters.includes(item.value) ? 'on' : undefined}
                data-test-subj={`ruleType${item.value}FilterOption`}
              >
                {item.name}
              </EuiFilterSelectItem>
            ))}
          </Fragment>
        ))}
      </div>
    </EuiPopover>
  );
};
