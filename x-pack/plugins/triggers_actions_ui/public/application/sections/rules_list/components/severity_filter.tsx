import React, { useState } from 'react';

import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiFilterSelectItem,
} from '@elastic/eui';

type Props = {
  onChange: (value: string) => void,
  selectedValue: string,
};

const severity = [
  'low',
  'medium',
  'high',
  'critical',
];

export const SeverityFilter = (props: Props) => {
  const { onChange, selectedValue = '' } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={!!selectedValue}
            numActiveFilters={selectedValue ? 1 : 0}
            numFilters={0}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="ruleTypeFilterButton"
          >
            Severity
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {severity.map((value) => {
            return (
              <EuiFilterSelectItem
                key={value}
                onClick={() => onChange(value === selectedValue ? '' : value)}
                checked={selectedValue === value ? 'on' : undefined}
              >
                {value}
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
