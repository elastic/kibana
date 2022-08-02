/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiSelectableListItem } from '@elastic/eui';
import { RuleStatus } from '../../../../types';

const statuses: RuleStatus[] = ['enabled', 'disabled', 'snoozed'];

const getOptionDataTestSubj = (status: RuleStatus) => `ruleStatusFilterOption-${status}`;

export interface RuleStatusFilterProps {
  selectedStatuses: RuleStatus[];
  dataTestSubj?: string;
  selectDataTestSubj?: string;
  buttonDataTestSubj?: string;
  optionDataTestSubj?: (status: RuleStatus) => string;
  onChange: (selectedStatuses: RuleStatus[]) => void;
}

export const RuleStatusFilter = (props: RuleStatusFilterProps) => {
  const {
    selectedStatuses = [],
    dataTestSubj = 'ruleStatusFilter',
    selectDataTestSubj = 'ruleStatusFilterSelect',
    buttonDataTestSubj = 'ruleStatusFilterButton',
    optionDataTestSubj = getOptionDataTestSubj,
    onChange = () => {},
  } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: RuleStatus) => () => {
      if (selectedStatuses.includes(newOption)) {
        onChange(selectedStatuses.filter((option) => option !== newOption));
        return;
      }
      onChange([...selectedStatuses, newOption]);
    },
    [selectedStatuses, onChange]
  );

  const onClick = useCallback(() => {
    setIsPopoverOpen((prevIsOpen) => !prevIsOpen);
  }, [setIsPopoverOpen]);

  const renderRuleStateOptions = (status: 'enabled' | 'disabled' | 'snoozed') => {
    if (status === 'enabled') {
      return (
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.enabledOptionText"
          defaultMessage="Rule is enabled"
        />
      );
    } else if (status === 'disabled') {
      return (
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.disabledOptionText"
          defaultMessage="Rule is disabled"
        />
      );
    } else if (status === 'snoozed') {
      return (
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.snoozedOptionText"
          defaultMessage="Rule has snoozed"
        />
      );
    }
  };

  return (
    <EuiFilterGroup data-test-subj={dataTestSubj}>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            data-test-subj={buttonDataTestSubj}
            iconType="arrowDown"
            hasActiveFilters={selectedStatuses.length > 0}
            numActiveFilters={selectedStatuses.length}
            numFilters={selectedStatuses.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilterButton"
              defaultMessage="Rule state"
            />
          </EuiFilterButton>
        }
      >
        <div data-test-subj={selectDataTestSubj}>
          {statuses.map((status) => {
            return (
              <EuiSelectableListItem
                key={status}
                data-test-subj={optionDataTestSubj(status)}
                onClick={onFilterItemClick(status)}
                checked={selectedStatuses.includes(status) ? 'on' : undefined}
              >
                {renderRuleStateOptions(status)}
              </EuiSelectableListItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleStatusFilter as default };
