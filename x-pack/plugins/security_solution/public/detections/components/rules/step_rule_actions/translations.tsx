/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';

export const COMPLETE_WITHOUT_ENABLING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithoutEnablingTitle',
  {
    defaultMessage: 'Create rule without enabling it',
  }
);

export const COMPLETE_WITH_ENABLING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithEnablingTitle',
  {
    defaultMessage: 'Create & enable rule',
  }
);

export const NO_ACTIONS_READ_PERMISSIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.noReadActionsPrivileges',
  {
    defaultMessage:
      'Cannot create rule actions. You do not have "Read" permissions for the "Actions" plugin.',
  }
);

const RULE_SNOOZE_DOCS_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.docsLinkText',
  {
    defaultMessage: 'Learn more',
  }
);

function RuleSnoozeDescription(): JSX.Element {
  const {
    docLinks: {
      links: {
        securitySolution: { manageDetectionRules },
      },
    },
  } = useKibana().services;
  const manageDetectionRulesSnoozeSection = `${manageDetectionRules}#edit-rules-settings`;

  return (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.createRule.stepRuleActions.snoozeDescription"
      defaultMessage="Choose when to perform actions or snooze them. Notifications are not created for snoozed actions. {docs}."
      values={{
        docs: (
          <EuiLink href={manageDetectionRulesSnoozeSection} target="_blank">
            {RULE_SNOOZE_DOCS_LINK_TEXT}
          </EuiLink>
        ),
      }}
    />
  );
}

export const RULE_SNOOZE_DESCRIPTION = <RuleSnoozeDescription />;
