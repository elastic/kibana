/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, EuiHealth } from '@elastic/eui';
import { RuleLastRunOutcomes, RuleLastRunOutcomeValues } from '@kbn/alerting-plugin/common';
import { rulesLastRunOutcomeTranslationMapping } from '../translations';
import { getOutcomeHealthColor } from '../../../../common/lib';

const sortedRuleLastRunOutcomeValues = [...RuleLastRunOutcomeValues].sort();

interface RuleLastRunOutcomeFilterProps {
  selectedOutcomes: string[];
  onChange?: (selectedRuleOutcomeIds: string[]) => void;
}

export const RuleLastRunOutcomeFilter: React.FunctionComponent<RuleLastRunOutcomeFilterProps> = ({
  selectedOutcomes,
  onChange,
}: RuleLastRunOutcomeFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onTogglePopover = useCallback(() => {
    setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  }, [setIsPopoverOpen]);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const onFilterSelectItem = useCallback(
    (filterItem: string) => () => {
      const isPreviouslyChecked = selectedOutcomes.includes(filterItem);
      if (isPreviouslyChecked) {
        onChange?.(selectedOutcomes.filter((val) => val !== filterItem));
      } else {
        onChange?.(selectedOutcomes.concat(filterItem));
      }
    },
    [onChange, selectedOutcomes]
  );

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          hasActiveFilters={selectedOutcomes.length > 0}
          numActiveFilters={selectedOutcomes.length}
          numFilters={selectedOutcomes.length}
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
          const healthColor = getOutcomeHealthColor(item);
          return (
            <EuiFilterSelectItem
              key={item}
              style={{ textTransform: 'capitalize' }}
              onClick={onFilterSelectItem(item)}
              checked={selectedOutcomes.includes(item) ? 'on' : undefined}
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

export { getOutcomeHealthColor as getHealthColor };
