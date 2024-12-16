/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { RuleCustomizationEnum } from '../../../../rule_management/logic';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { toggleSelectedGroup } from '../../../../../common/components/ml_popover/jobs_table/filters/toggle_selected_group';

interface RuleCustomizationFilterPopoverProps {
  selectedRuleSource: RuleCustomizationEnum[];
  onSelectedRuleSourceChanged: (newRuleSource: RuleCustomizationEnum[]) => void;
}

const RULE_CUSTOMIZATION_POPOVER_WIDTH = 200;

const RuleCustomizationFilterPopoverComponent = ({
  selectedRuleSource,
  onSelectedRuleSourceChanged,
}: RuleCustomizationFilterPopoverProps) => {
  const [isRuleCustomizationPopoverOpen, setIsRuleCustomizationPopoverOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.MODIFIED_LABEL,
        key: RuleCustomizationEnum.customized,
        checked: selectedRuleSource.includes(RuleCustomizationEnum.customized) ? 'on' : undefined,
      },
      {
        label: i18n.UNMODIFIED_LABEL,
        key: RuleCustomizationEnum.not_customized,
        checked: selectedRuleSource.includes(RuleCustomizationEnum.not_customized)
          ? 'on'
          : undefined,
      },
    ],
    [selectedRuleSource]
  );

  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changedOption: EuiSelectableOption
  ) => {
    toggleSelectedGroup(
      changedOption.key ?? '',
      selectedRuleSource,
      onSelectedRuleSourceChanged as (args: string[]) => void
    );
  };

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsRuleCustomizationPopoverOpen(!isRuleCustomizationPopoverOpen)}
      numFilters={selectableOptions.length}
      isSelected={isRuleCustomizationPopoverOpen}
      hasActiveFilters={selectedRuleSource.length > 0}
      numActiveFilters={selectedRuleSource.length}
      data-test-subj="rule-customization-filter-popover-button"
    >
      {i18n.RULE_SOURCE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isRuleCustomizationPopoverOpen}
      closePopover={() => setIsRuleCustomizationPopoverOpen(!isRuleCustomizationPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'rule-customization-filter-popover',
      }}
    >
      <EuiSelectable options={selectableOptions} onChange={handleSelectableOptionsChange}>
        {(list) => <div style={{ width: RULE_CUSTOMIZATION_POPOVER_WIDTH }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const RuleCustomizationFilterPopover = React.memo(RuleCustomizationFilterPopoverComponent);
