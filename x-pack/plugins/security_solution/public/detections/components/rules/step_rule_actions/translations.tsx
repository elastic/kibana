/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDocLinks } from '@kbn/doc-links';
import { EuiLink } from '@elastic/eui';

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

const ruleSnoozeDocsLink = `${
  getDocLinks({ kibanaBranch: 'main' }).alerting.guide
}#controlling-rules`;

const RULE_SNOOZE_DOCS_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.docsLinkText',
  {
    defaultMessage: 'docs',
  }
);

export const RULE_SNOOZE_DESCRIPTION = (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.createRule.stepRuleActions.snoozeDescription"
    defaultMessage="Select when automated actions should be performed. If a rule is snoozed actions will not be performed. Learn more about actions in our {docs}."
    values={{
      docs: (
        <EuiLink href={ruleSnoozeDocsLink} target="_blank">
          {RULE_SNOOZE_DOCS_LINK_TEXT}
        </EuiLink>
      ),
    }}
  />
);
