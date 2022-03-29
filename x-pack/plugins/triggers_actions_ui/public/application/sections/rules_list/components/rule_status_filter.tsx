/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiHealth,
} from '@elastic/eui';
import {
  AlertExecutionStatuses,
  AlertExecutionStatusValues,
} from '../../../../../../alerting/common';
import { rulesStatusesTranslationsMapping } from '../translations';

interface RuleStatusFilterProps {
  selectedStatuses: string[];
  onChange?: (selectedRuleStatusesIds: string[]) => void;
}

export const RuleStatusFilter: React.FunctionComponent<RuleStatusFilterProps> = ({
  selectedStatuses,
  onChange,
}: RuleStatusFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedStatuses);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

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
            data-test-subj="ruleStatusFilterButton"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.ruleStatusFilterLabel"
              defaultMessage="Last response"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {[...AlertExecutionStatusValues].sort().map((item: AlertExecutionStatuses) => {
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
                data-test-subj={`ruleStatus${item}FilerOption`}
              >
                <EuiHealth color={healthColor}>{rulesStatusesTranslationsMapping[item]}</EuiHealth>
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export function getHealthColor(status: AlertExecutionStatuses) {
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
