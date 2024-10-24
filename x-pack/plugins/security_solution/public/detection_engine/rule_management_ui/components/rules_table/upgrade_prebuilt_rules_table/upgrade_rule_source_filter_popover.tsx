/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { RuleSourceTypesEnum } from '../../../../rule_management/logic';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { toggleSelectedGroup } from '../../../../../common/components/ml_popover/jobs_table/filters/toggle_selected_group';

interface RuleSourceFilterPopoverProps {
  selectedRuleSource: RuleSourceTypesEnum[];
  onSelectedRuleSourceChanged: (newRuleSource: RuleSourceTypesEnum[]) => void;
}

const RULE_SOURCE_POPOVER_WIDTH = 200;

const RuleSourceFilterPopoverComponent = ({
  selectedRuleSource,
  onSelectedRuleSourceChanged,
}: RuleSourceFilterPopoverProps) => {
  const [isRuleSourcePopoverOpen, setIsRuleSourcePopoverOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.MODIFIED_LABEL,
        key: RuleSourceTypesEnum.MODIFIED,
        checked: selectedRuleSource.includes(RuleSourceTypesEnum.MODIFIED) ? 'on' : undefined,
      },
      {
        label: i18n.UNMODIFIED_LABEL,
        key: RuleSourceTypesEnum.UNMODIFIED,
        checked: selectedRuleSource.includes(RuleSourceTypesEnum.UNMODIFIED) ? 'on' : undefined,
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
      onClick={() => setIsRuleSourcePopoverOpen(!isRuleSourcePopoverOpen)}
      numFilters={selectableOptions.length}
      isSelected={isRuleSourcePopoverOpen}
      hasActiveFilters={selectedRuleSource.length > 0}
      numActiveFilters={selectedRuleSource.length}
      data-test-subj="rule-source-filter-popover-button"
    >
      {i18n.RULE_SOURCE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isRuleSourcePopoverOpen}
      closePopover={() => setIsRuleSourcePopoverOpen(!isRuleSourcePopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'rule-source-filter-popover',
      }}
    >
      <EuiSelectable options={selectableOptions} onChange={handleSelectableOptionsChange}>
        {(list) => <div style={{ width: RULE_SOURCE_POPOVER_WIDTH }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const RuleSourceFilterPopover = React.memo(RuleSourceFilterPopoverComponent);
