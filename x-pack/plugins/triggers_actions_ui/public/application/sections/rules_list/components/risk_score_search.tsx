import React, { useState } from 'react';

import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiFieldSearch,
  EuiSpacer,
} from '@elastic/eui';

type Props = {
  onChange: (value: string) => void,
};

export const RiskScoreSearch = (props: Props) => {
  const { onChange } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const [value, setValue] = useState<string>('');

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="ruleTypeFilterButton"
          >
            Risk Score Search
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          <EuiFieldSearch
            placeholder="risk score"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <EuiSpacer />
          <EuiFilterButton
            onClick={() => onChange(value)}
          >
            Search
          </EuiFilterButton>
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
