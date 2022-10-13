/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterGroup, EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';

interface SolutionFilterProps {
  solutions: Map<string, string>;
  onChange?: (selectedSolutions: string[]) => void;
}

export const SolutionFilter: React.FunctionComponent<SolutionFilterProps> = ({
  solutions,
  onChange,
}: SolutionFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={selectedValues.length > 0}
            numActiveFilters={selectedValues.length}
            numFilters={selectedValues.length}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="solutionsFilterButton"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleForm.solutionFilterLabel"
              defaultMessage="Filter by use case"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {[...solutions.entries()].map(([id, title]) => (
            <EuiFilterSelectItem
              key={id}
              onClick={() => {
                const isPreviouslyChecked = selectedValues.includes(id);
                if (isPreviouslyChecked) {
                  setSelectedValues(selectedValues.filter((val) => val !== id));
                } else {
                  setSelectedValues([...selectedValues, id]);
                }
              }}
              checked={selectedValues.includes(id) ? 'on' : undefined}
              data-test-subj={`solution${id}FilterOption`}
            >
              {title}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
