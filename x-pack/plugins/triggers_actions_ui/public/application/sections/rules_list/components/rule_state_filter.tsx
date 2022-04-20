/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiFilterSelectItem } from '@elastic/eui';

type State = 'enabled' | 'muted' | 'disabled';

const states: State[] = ['enabled', 'disabled', 'muted'];

const optionStyles = {
  textTransform: 'capitalize' as const,
};

const getOptionDataTestSubj = (state: State) => `ruleStateFilterOption-${state}`;

export interface RuleStateFilterProps {
  selectedStates: State[];
  dataTestSubj?: string;
  buttonDataTestSubj?: string;
  optionDataTestSubj?: (state: State) => string;
  onChange: (selectedStates: State[]) => void;
}

export const RuleStateFilter = (props: RuleStateFilterProps) => {
  const {
    selectedStates = [],
    dataTestSubj = 'ruleStateFilterSelect',
    buttonDataTestSubj = 'ruleStateFilterButton',
    optionDataTestSubj = getOptionDataTestSubj,
    onChange = () => {},
  } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: State) => () => {
      if (selectedStates.includes(newOption)) {
        onChange(selectedStates.filter((option) => option !== newOption));
        return;
      }
      onChange([...selectedStates, newOption]);
    },
    [selectedStates, onChange]
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
            data-test-subj={buttonDataTestSubj}
            iconType="arrowDown"
            hasActiveFilters={selectedStates.length > 0}
            numActiveFilters={selectedStates.length}
            numFilters={selectedStates.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilterButton"
              defaultMessage="State"
            />
          </EuiFilterButton>
        }
      >
        <div data-test-subj={dataTestSubj}>
          {states.map((state) => {
            return (
              <EuiFilterSelectItem
                key={state}
                style={optionStyles}
                data-test-subj={optionDataTestSubj(state)}
                onClick={onFilterItemClick(state)}
                checked={selectedStates.includes(state) ? 'on' : undefined}
              >
                {state}
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleStateFilter as default };
