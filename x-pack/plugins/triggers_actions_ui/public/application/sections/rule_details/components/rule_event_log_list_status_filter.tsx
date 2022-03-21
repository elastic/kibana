/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFilterButton,
  EuiPopover,
  EuiFilterGroup,
  EuiIcon,
  EuiFilterSelectItem,
} from '@elastic/eui';

const listItemStyles = {
  display: 'flex',
  alignItems: 'center',
};

export const statusToIcon: Record<string, React.ReactNode> = {
  success: <EuiIcon type="dot" color="success" />,
  failed: <EuiIcon type="dot" color="danger" />,
};

interface RuleEventLogListStatusFilterProps {
  options: string[];
  selectedOptions: string[];
  onChange: (selectedValues: string[]) => void;
}

export const RuleEventLogListStatusFilter = (props: RuleEventLogListStatusFilterProps) => {
  const { options = [], selectedOptions = [], onChange = () => {} } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = (newOption: string) => () => {
    if (selectedOptions.includes(newOption)) {
      onChange(selectedOptions.filter((option) => option !== newOption));
      return;
    }
    onChange([...selectedOptions, newOption]);
  };

  const onClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={selectedOptions.length > 0}
            numActiveFilters={selectedOptions.length}
            numFilters={selectedOptions.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.eventLogStatusFilterLabel"
              defaultMessage="Status"
            />
          </EuiFilterButton>
        }
      >
        <React.Fragment>
          {options.map((option) => {
            return (
              <EuiFilterSelectItem
                key={option}
                onClick={onFilterItemClick(option)}
                checked={selectedOptions.includes(option) ? 'on' : undefined}
              >
                <div style={listItemStyles}>
                  {statusToIcon[option]} {option}
                </div>
              </EuiFilterSelectItem>
            );
          })}
        </React.Fragment>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
