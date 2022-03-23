/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EuiFilterGroup, EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleStatus } from '../../types';
import { statusMap } from '../../config';

export function StatusFilter({ selectedStatuses, onChange }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedStatuses);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
  }, [selectedValues, onChange]);

  useEffect(() => {
    setSelectedValues(selectedStatuses);
  }, [selectedStatuses]);

  const panelItems = useMemo(
    () =>
      Object.values(RuleStatus).map((status: RuleStatus) => (
        <EuiFilterSelectItem
          key={status}
          onClick={() => {
            const isPreviouslyChecked = selectedValues.includes(status);
            if (isPreviouslyChecked) {
              setSelectedValues(selectedValues.filter((val) => val !== status));
            } else {
              setSelectedValues(selectedValues.concat(status));
            }
          }}
          checked={selectedValues.includes(status) ? 'on' : undefined}
          data-test-subj={`ruleStatus${status}FilterOption`}
        >
          {statusMap[status].label}
        </EuiFilterSelectItem>
      )),
    [selectedValues]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={selectedValues.length > 0}
            numActiveFilters={selectedValues.length}
            numFilters={selectedValues.length}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="ruleStatusFilterButton"
          >
            <FormattedMessage
              id="xpack.observability.rules.ruleStatusFilterLabel"
              defaultMessage="Status"
            />
          </EuiFilterButton>
        }
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downLeft"
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        {panelItems}
      </EuiPopover>
    </EuiFilterGroup>
  );
}
