/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiFilterSelectItem, EuiPopover } from '@elastic/eui';

export const JobIdFilter: React.FC<{
  selectedJobIds: string[];
  jobIds: string[];
  jobNameById: Record<string, string | undefined>;
  onSelect: (jobIds: string[]) => void;
  title: string;
}> = ({ selectedJobIds, onSelect, title, jobIds, jobNameById }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const updateSelection = useCallback(
    (selectedJobId: string) => {
      const currentSelection = selectedJobIds ?? [];
      const newSelection = currentSelection.includes(selectedJobId)
        ? currentSelection.filter((s) => s !== selectedJobId)
        : [...currentSelection, selectedJobId];

      onSelect(newSelection);
    },
    [selectedJobIds, onSelect]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        disabled={jobIds.length === 0}
        data-test-subj="job-id-filter-button"
        hasActiveFilters={selectedJobIds.length > 0}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        numActiveFilters={selectedJobIds.length}
        onClick={onButtonClick}
        contentProps={{ style: { minWidth: 112 } }} // avoid resizing when selecting job id
      >
        {title}
      </EuiFilterButton>
    ),
    [jobIds.length, selectedJobIds.length, isPopoverOpen, onButtonClick, title]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <div className="euiFilterSelect__items">
          {jobIds.map((id) => (
            <EuiFilterSelectItem
              data-test-subj={`job-id-filter-item-${id}`}
              checked={selectedJobIds.includes(id) ? 'on' : undefined}
              key={id}
              onClick={() => updateSelection(id)}
            >
              {jobNameById[id] ?? id}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
