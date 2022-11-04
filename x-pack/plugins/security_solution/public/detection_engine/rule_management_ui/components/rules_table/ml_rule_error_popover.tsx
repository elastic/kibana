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
  EuiSpacer,
  EuiPopoverFooter,
} from '@elastic/eui';

import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecurityPageName } from '../../../../../common/constants';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { isMlRule } from '../../../../../common/detection_engine/utils';
import { getCapitalizedStatusText } from '../../../../detections/components/rules/rule_execution_status/utils';
import type { Rule } from '../../../rule_management/logic';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details';

interface MlRuleErrorPopoverComponentProps {
  rule: Rule;
}

const MlRuleErrorPopoverComponent: React.FC<MlRuleErrorPopoverComponentProps> = ({ rule }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((open) => !open);
  const closePopover = () => setIsPopoverOpen(false);

  const { loading: loadingJobs, jobs } = useSecurityJobs();

  if (!isMlRule(rule.type) || loadingJobs || !rule.machine_learning_job_id) {
    return null;
  }

  const jobIds = rule.machine_learning_job_id;
  const notRunningJobs = jobs.filter(
    (job) => jobIds.includes(job.id) && !isJobStarted(job.jobState, job.datafeedState)
  );
  if (!notRunningJobs.length) {
    return null;
  }

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
          <p>{i18n.ML_RULE_JOBS_WARNING_DESCRIPTION}</p>
        </EuiText>
      </div>
      <EuiSpacer size="s" />
      {notRunningJobs.map((job) => (
        <EuiText>{job.id}</EuiText>
      ))}
      <EuiPopoverFooter>
        <SecuritySolutionLinkButton
          data-test-subj="open-rule-details"
          // fill
          fullWidth
          deepLinkId={SecurityPageName.rules}
          path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
        >
          {i18n.ML_RULE_JOBS_WARNING_BUTTON_LABEL}
        </SecuritySolutionLinkButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const MlRuleErrorPopover = React.memo(MlRuleErrorPopoverComponent);

MlRuleErrorPopover.displayName = 'MlRuleErrorPopover';
