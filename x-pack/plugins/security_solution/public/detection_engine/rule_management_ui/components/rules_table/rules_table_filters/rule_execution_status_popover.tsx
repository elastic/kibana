/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { RuleExecutionStatus } from '../../../../../../common/detection_engine/rule_monitoring/model/execution_status';
import { getCapitalizedStatusText } from '../../../../../detections/components/rules/rule_execution_status/utils';
const TAGS_POPOVER_WIDTH = 274;

interface RuleExecutionStatusPopoverProps {
  selectedStatus?: RuleExecutionStatus;
  onSelectedStatusChanged: (newStatus?: RuleExecutionStatus) => void;
}

/**
 * Popover for selecting last rule execution status to filter on
 *
 * @param selectedStatus Selected rule execution status
 * @param onSelectedStatusChanged change listener to be notified when rule execution status selection changes
 */
const RuleExecutionStatusPopoverComponent = ({
  selectedStatus,
  onSelectedStatusChanged,
}: RuleExecutionStatusPopoverProps) => {
  const [isExecutionStatusPopoverOpen, setIsExecutionStatusPopoverOpen] = useState(false);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>(() => [
    {
      label: getCapitalizedStatusText(RuleExecutionStatus.succeeded) as string,
      data: { status: RuleExecutionStatus.succeeded },
      checked: selectedStatus === RuleExecutionStatus.succeeded ? 'on' : undefined,
    },
    {
      label: getCapitalizedStatusText(RuleExecutionStatus['partial failure']) as string,
      data: { status: RuleExecutionStatus['partial failure'] },
      checked: selectedStatus === RuleExecutionStatus['partial failure'] ? 'on' : undefined,
    },
    {
      label: getCapitalizedStatusText(RuleExecutionStatus.failed) as string,
      data: { status: RuleExecutionStatus.failed },
      checked: selectedStatus === RuleExecutionStatus.failed ? 'on' : undefined,
    },
  ]);

  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changedOption: EuiSelectableOption
  ) => {
    setSelectableOptions(newOptions);
    setIsExecutionStatusPopoverOpen(false);

    if (changedOption.checked && changedOption?.data?.status) {
      onSelectedStatusChanged(changedOption.data.status as RuleExecutionStatus);
    } else if (!changedOption.checked) {
      onSelectedStatusChanged();
    }
  };

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => {
        setIsExecutionStatusPopoverOpen(!isExecutionStatusPopoverOpen);
      }}
      numFilters={selectableOptions.length}
      isSelected={isExecutionStatusPopoverOpen}
      hasActiveFilters={selectedStatus !== undefined}
      numActiveFilters={selectedStatus !== undefined ? 1 : 0}
      data-test-subj="tags-filter-popover-button"
    >
      {i18n.COLUMN_LAST_RESPONSE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isExecutionStatusPopoverOpen}
      closePopover={() => {
        setIsExecutionStatusPopoverOpen(!isExecutionStatusPopoverOpen);
      }}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'tags-filter-popover',
      }}
    >
      <EuiSelectable
        aria-label={i18n.RULES_TAG_SEARCH}
        options={selectableOptions}
        onChange={handleSelectableOptionsChange}
        emptyMessage={i18n.NO_TAGS_AVAILABLE}
        noMatchesMessage={i18n.NO_TAGS_AVAILABLE}
        singleSelection
      >
        {(list, search) => (
          <div style={{ width: TAGS_POPOVER_WIDTH }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

RuleExecutionStatusPopoverComponent.displayName = 'RuleExecutionStatusPopoverComponent';

export const RuleExecutionStatusPopover = React.memo(RuleExecutionStatusPopoverComponent);

RuleExecutionStatusPopover.displayName = 'RuleExecutionStatusPopover';
