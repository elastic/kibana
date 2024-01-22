/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPopover,
  EuiText,
  EuiPopoverTitle,
  EuiSpacer,
  EuiPopoverFooter,
  EuiButtonIcon,
} from '@elastic/eui';

import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import * as i18n from './translations';

import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecurityPageName } from '../../../../../common/constants';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { isMlRule } from '../../../../../common/detection_engine/utils';
import { getCapitalizedStatusText } from '../../../../detections/components/rules/rule_execution_status/utils';
import type { Rule } from '../../../rule_management/logic';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { getMachineLearningJobId } from '../../../../detections/pages/detection_engine/rules/helpers';

const POPOVER_WIDTH = '340px';

interface MlRuleWarningPopoverComponentProps {
  rule: Rule;
  loadingJobs: boolean;
  jobs: SecurityJob[];
}

const MlRuleWarningPopoverComponent: React.FC<MlRuleWarningPopoverComponentProps> = ({
  rule,
  loadingJobs,
  jobs,
}) => {
  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();
  const jobIds = getMachineLearningJobId(rule);

  if (!isMlRule(rule.type) || loadingJobs || !jobIds) {
    return null;
  }

  const notRunningJobs = jobs.filter(
    (job) => jobIds.includes(job.id) && !isJobStarted(job.jobState, job.datafeedState)
  );
  if (!notRunningJobs.length) {
    return null;
  }

  const button = (
    <EuiButtonIcon
      display={'empty'}
      color={'warning'}
      iconType={'warning'}
      onClick={togglePopover}
    />
  );
  const popoverTitle = getCapitalizedStatusText(RuleExecutionStatusEnum['partial failure']);

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle>{popoverTitle}</EuiPopoverTitle>
      <div style={{ width: POPOVER_WIDTH }}>
        <EuiText size="s">
          <p>{i18n.ML_RULE_JOBS_WARNING_DESCRIPTION}</p>
        </EuiText>
      </div>
      <EuiSpacer size="s" />
      {notRunningJobs.map((job) => (
        <EuiText>{job.customSettings?.security_app_display_name ?? job.id}</EuiText>
      ))}
      <EuiPopoverFooter>
        <SecuritySolutionLinkButton
          data-test-subj="open-rule-details"
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

export const MlRuleWarningPopover = React.memo(MlRuleWarningPopoverComponent);

MlRuleWarningPopover.displayName = 'MlRuleWarningPopover';
