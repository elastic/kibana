/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiText,
  EuiIcon,
  EuiPopoverTitle,
  EuiDescriptionList,
  EuiSpacer,
} from '@elastic/eui';

import { getCapitalizedStatusText } from '../../../../detections/components/rules/rule_execution_status/utils';
import { buildMlJobsDescription } from '../../../../detections/components/rules/description_step/ml_job_description';
import type { Rule } from '../../../rule_management/logic';

interface RuleErrorPopoverComponentProps {
  rule: Rule;
}

const RuleErrorPopoverComponent: React.FC<RuleErrorPopoverComponentProps> = ({ rule }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((open) => !open);
  const closePopover = () => setIsPopoverOpen(false);
  const button = <EuiIcon type={'alert'} onClick={onButtonClick} />;

  const popoverTitle = getCapitalizedStatusText(rule.execution_summary?.last_execution.status);

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle>{popoverTitle}</EuiPopoverTitle>
      <div style={{ width: '340px' }}>
        <EuiText size="s">
          <p>{rule.execution_summary?.last_execution.message}</p>
        </EuiText>
      </div>
      <EuiSpacer size="s" />
      {rule.machine_learning_job_id && (
        <EuiDescriptionList
          listItems={[buildMlJobsDescription(rule.machine_learning_job_id, '')]}
        />
      )}
    </EuiPopover>
  );
};

export const RuleErrorPopover = React.memo(RuleErrorPopoverComponent);

RuleErrorPopover.displayName = 'RuleErrorPopover';
