/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPopover,
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiHealth,
  useEuiTheme,
} from '@elastic/eui';
import { RuleExecutionStatuses, RuleExecutionStatusValues } from '@kbn/alerting-plugin/common';
import { rulesStatusesTranslationsMapping } from '../translations';
import { getExecutionStatusHealthColor } from '../../../../common/lib';

interface RuleExecutionStatusFilterProps {
  selectedStatuses: string[];
  onChange?: (selectedRuleStatusesIds: string[]) => void;
}

const sortedRuleExecutionStatusValues = [...RuleExecutionStatusValues].sort();

export const RuleExecutionStatusFilter: React.FunctionComponent<RuleExecutionStatusFilterProps> = ({
  selectedStatuses,
  onChange,
}: RuleExecutionStatusFilterProps) => {
  const { euiTheme } = useEuiTheme();
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
      {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
          instead of EuiFilterSelectItem (which is pending deprecation).
          @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
      <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
        {sortedRuleExecutionStatusValues.map((item: RuleExecutionStatuses) => {
          const healthColor = getExecutionStatusHealthColor(item);
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

export { getExecutionStatusHealthColor as getHealthColor };
