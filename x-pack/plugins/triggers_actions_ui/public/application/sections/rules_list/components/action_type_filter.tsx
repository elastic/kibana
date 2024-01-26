/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, useEuiTheme } from '@elastic/eui';
import { ActionType } from '../../../../types';

interface ActionTypeFilterProps {
  actionTypes: ActionType[];
  onChange: (selectedActionTypeIds: string[]) => void;
  filters: string[];
}

export const ActionTypeFilter: React.FunctionComponent<ActionTypeFilterProps> = ({
  actionTypes,
  onChange: onFilterChange,
  filters,
}: ActionTypeFilterProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onClick = useCallback(
    (item: ActionType) => {
      return () => {
        const isPreviouslyChecked = filters.includes(item.id);
        if (isPreviouslyChecked) {
          onFilterChange(filters.filter((val) => val !== item.id));
        } else {
          onFilterChange(filters.concat(item.id));
        }
      };
    },
    [filters, onFilterChange]
  );

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
          data-test-subj="actionTypeFilterButton"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.actionTypeFilterLabel"
            defaultMessage="Action type"
          />
        </EuiFilterButton>
      }
    >
      {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
          instead of EuiFilterSelectItem (which is pending deprecation).
          @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
      <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
        {actionTypes.map((item) => (
          <EuiFilterSelectItem
            key={item.id}
            onClick={onClick(item)}
            checked={filters.includes(item.id) ? 'on' : undefined}
            data-test-subj={`actionType${item.id}FilterOption`}
          >
            {item.name}
          </EuiFilterSelectItem>
        ))}
      </div>
    </EuiPopover>
  );
};
