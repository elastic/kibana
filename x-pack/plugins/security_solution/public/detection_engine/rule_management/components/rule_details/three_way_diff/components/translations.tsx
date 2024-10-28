/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';

export const NUM_OF_FIELDS_WITH_UPDATES = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.fieldsWithUpdates"
    defaultMessage="Upgrade has {count} {count, plural, one {field} other {fields}}"
    values={{ count: <strong>{count}</strong> }}
  />
);

export const NUM_OF_CONFLICTS = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.numOfConflicts"
    defaultMessage="{count} {count, plural, one {conflict} other {conflicts}}"
    values={{ count: <strong>{count}</strong> }}
  />
);

const UPGRADE_RULES_DOCS_LINK = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.updateYourRulesDocsLink',
  {
    defaultMessage: 'update your rules',
  }
);

export function RuleUpgradeHelper(): JSX.Element {
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
      id="xpack.securitySolution.detectionEngine.rules.upgradeRules.ruleUpgradeHelper"
      defaultMessage="Understand how to&nbsp;{docsLink}."
      values={{
        docsLink: (
          <EuiLink href={manageDetectionRulesSnoozeSection} target="_blank">
            {UPGRADE_RULES_DOCS_LINK}
          </EuiLink>
        ),
      }}
    />
  );
}
