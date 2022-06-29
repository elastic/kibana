/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, EuiHealth } from '@elastic/eui';
import { RuleExecutionStatuses, RuleExecutionStatusValues } from '@kbn/alerting-plugin/common';
import { rulesStatusesTranslationsMapping } from '../translations';

interface RuleExecutionStatusFilterProps {
  selectedStatuses: string[];
  onChange?: (selectedRuleStatusesIds: string[]) => void;
}

const sortedRuleExecutionStatusValues = [...RuleExecutionStatusValues].sort();

export const RuleExecutionStatusFilter: React.FunctionComponent<RuleExecutionStatusFilterProps> = ({
  selectedStatuses,
  onChange,
}: RuleExecutionStatusFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedStatuses);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onTogglePopover = useCallback(() => {
    setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  }, [setIsPopoverOpen]);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues]);

  useEffect(() => {
    setSelectedValues(selectedStatuses);
  }, [selectedStatuses]);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          hasActiveFilters={selectedValues.length > 0}
          numActiveFilters={selectedValues.length}
          numFilters={selectedValues.length}
          onClick={onTogglePopover}
          data-test-subj="ruleExecutionStatusFilterButton"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.ruleExecutionStatusFilterLabel"
            defaultMessage="Last response"
          />
        </EuiFilterButton>
      }
    >
      <div className="euiFilterSelect__items">
        {sortedRuleExecutionStatusValues.map((item: RuleExecutionStatuses) => {
          const healthColor = getHealthColor(item);
          return (
            <EuiFilterSelectItem
              key={item}
              style={{ textTransform: 'capitalize' }}
              onClick={() => {
                const isPreviouslyChecked = selectedValues.includes(item);
                if (isPreviouslyChecked) {
                  setSelectedValues(selectedValues.filter((val) => val !== item));
                } else {
                  setSelectedValues(selectedValues.concat(item));
                }
              }}
              checked={selectedValues.includes(item) ? 'on' : undefined}
              data-test-subj={`ruleExecutionStatus${item}FilterOption`}
            >
              <EuiHealth color={healthColor}>{rulesStatusesTranslationsMapping[item]}</EuiHealth>
            </EuiFilterSelectItem>
          );
        })}
      </div>
    </EuiPopover>
  );
};

export function getHealthColor(status: RuleExecutionStatuses) {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'danger';
    case 'ok':
      return 'primary';
    case 'pending':
      return 'accent';
    case 'warning':
      return 'warning';
    default:
      return 'subdued';
  }
}
