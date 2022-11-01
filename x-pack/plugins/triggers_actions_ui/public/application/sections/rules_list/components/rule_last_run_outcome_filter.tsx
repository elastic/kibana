/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, EuiHealth } from '@elastic/eui';
import { RuleLastRunOutcomes, RuleLastRunOutcomeValues } from '@kbn/alerting-plugin/common';
import { rulesLastRunOutcomeTranslationMapping } from '../translations';

const sortedRuleLastRunOutcomeValues = [...RuleLastRunOutcomeValues].sort();

export const getHealthColor = (status: RuleLastRunOutcomes) => {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'subdued';
  }
};

interface RuleLastRunOutcomeFilterProps {
  selectedOutcomes: string[];
  onChange?: (selectedRuleOutcomeIds: string[]) => void;
}

export const RuleLastRunOutcomeFilter: React.FunctionComponent<RuleLastRunOutcomeFilterProps> = ({
  selectedOutcomes,
  onChange,
}: RuleLastRunOutcomeFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedOutcomes);
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
    setSelectedValues(selectedOutcomes);
  }, [selectedOutcomes]);

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
          data-test-subj="ruleLastRunOutcomeFilterButton"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.ruleLastRunOutcomeFilterLabel"
            defaultMessage="Last response"
          />
        </EuiFilterButton>
      }
    >
      <div className="euiFilterSelect__items">
        {sortedRuleLastRunOutcomeValues.map((item: RuleLastRunOutcomes) => {
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
              data-test-subj={`ruleLastRunOutcome${item}FilterOption`}
            >
              <EuiHealth color={healthColor}>
                {rulesLastRunOutcomeTranslationMapping[item]}
              </EuiHealth>
            </EuiFilterSelectItem>
          );
        })}
      </div>
    </EuiPopover>
  );
};
