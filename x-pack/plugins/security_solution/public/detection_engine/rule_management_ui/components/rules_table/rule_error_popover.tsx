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
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiButton,
  EuiDescriptionList,
  EuiSpacer,
} from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { buildMlJobsDescription } from '../../../../detections/components/rules/description_step/ml_job_description';
import type { Rule } from '../../../rule_management/logic';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

interface RuleErrorPopoverComponentProps {
  rule: Rule;
}

const RuleErrorPopoverComponent: React.FC<RuleErrorPopoverComponentProps> = ({ rule }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((open) => !open);
  const closePopover = () => setIsPopoverOpen(false);
  const button = <EuiIcon type={'alert'} onClick={onButtonClick} />;
  const { navigateToApp } = useKibana().services.application;

  const handleGoToMlPageClick = () => {
    onButtonClick();
    navigateToApp('ml', {
      openInNewTab: true,
    });
  };

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle>{i18n.FAILED_ML_RULE_POPEVER_TITLE}</EuiPopoverTitle>
      <div style={{ width: '500px' }}>
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
      <EuiPopoverFooter>
        <EuiButton fullWidth size="s" onClick={handleGoToMlPageClick}>
          {i18n.GO_TO_ML_PAGE_BUTTON_LABEL}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const RuleErrorPopover = React.memo(RuleErrorPopoverComponent);

RuleErrorPopover.displayName = 'RuleErrorPopover';
