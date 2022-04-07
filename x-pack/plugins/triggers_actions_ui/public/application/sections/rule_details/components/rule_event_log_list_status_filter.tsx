/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiFilterSelectItem } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { EcsEventOutcome } from 'kibana/server';
import { RuleEventLogListStatus } from './rule_event_log_list_status';

const statusFilters: EcsEventOutcome[] = ['success', 'failure', 'unknown'];

interface RuleEventLogListStatusFilterProps {
  selectedOptions: string[];
  onChange: (selectedValues: string[]) => void;
}

export const RuleEventLogListStatusFilter = (props: RuleEventLogListStatusFilterProps) => {
  const { selectedOptions = [], onChange = () => {} } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: string) => () => {
      if (selectedOptions.includes(newOption)) {
        onChange(selectedOptions.filter((option) => option !== newOption));
        return;
      }
      onChange([...selectedOptions, newOption]);
    },
    [selectedOptions, onChange]
  );

  const onClick = useCallback(() => {
    setIsPopoverOpen((prevIsOpen) => !prevIsOpen);
  }, [setIsPopoverOpen]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            data-test-subj="ruleEventLogStatusFilterButton"
            iconType="arrowDown"
            hasActiveFilters={selectedOptions.length > 0}
            numActiveFilters={selectedOptions.length}
            numFilters={selectedOptions.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.eventLogStatusFilterLabel"
              defaultMessage="Status"
            />
          </EuiFilterButton>
        }
      >
        <>
          {statusFilters.map((status) => {
            return (
              <EuiFilterSelectItem
                key={status}
                data-test-subj={`ruleEventLogStatusFilter-${status}`}
                onClick={onFilterItemClick(status)}
                checked={selectedOptions.includes(status) ? 'on' : undefined}
              >
                <RuleEventLogListStatus status={status} />
              </EuiFilterSelectItem>
            );
          })}
        </>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
