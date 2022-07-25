/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFilterButton,
  EuiPopover,
  EuiFilterGroup,
  EuiSelectableListItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { RuleStatus } from '../../../../types';

const statuses: RuleStatus[] = ['enabled', 'disabled', 'snoozed'];

const optionStyles = {
  textTransform: 'capitalize' as const,
};

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

  const renderClearAll = () => {
    return (
      <div>
        <EuiButtonEmpty
          style={{
            width: '100%',
          }}
          size="xs"
          iconType="crossInACircleFilled"
          color="danger"
          onClick={() => onChange([])}
        >
          Clear all
        </EuiButtonEmpty>
      </div>
    );
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
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleStatusFilterButton"
              defaultMessage="View"
            />
          </EuiFilterButton>
        }
      >
        <div data-test-subj={selectDataTestSubj}>
          {statuses.map((status) => {
            return (
              <EuiSelectableListItem
                key={status}
                style={optionStyles}
                data-test-subj={optionDataTestSubj(status)}
                onClick={onFilterItemClick(status)}
                checked={selectedStatuses.includes(status) ? 'on' : undefined}
              >
                {status}
              </EuiSelectableListItem>
            );
          })}
          {renderClearAll()}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleStatusFilter as default };
