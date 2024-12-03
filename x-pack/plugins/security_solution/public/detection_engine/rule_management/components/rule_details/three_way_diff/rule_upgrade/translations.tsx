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
    defaultMessage="Update has {count} {count, plural, one {field} other {fields}}"
    values={{ count: <strong>{count}</strong> }}
  />
);

export const NUM_OF_SOLVED_CONFLICTS = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.numOfSolvableConflicts"
    defaultMessage="{count} solved {count, plural, one {conflict} other {conflicts}}"
    values={{ count: <strong>{count}</strong> }}
  />
);

export const NUM_OF_UNSOLVED_CONFLICTS = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.numOfNonSolvableConflicts"
    defaultMessage="{count} unsolved {count, plural, one {conflict} other {conflicts}}"
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

export const UPGRADE_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.upgradeStatusTitle',
  {
    defaultMessage: 'Update status:',
  }
);

export const RULE_HAS_NON_SOLVABLE_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasNonSolvableConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} {count, plural, one {field has a unsolved conflict} other {fields have unsolved conflicts}}. Please review and provide a final update.',
    }
  );

export const RULE_HAS_NON_SOLVABLE_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasNonSolvableConflictsDescription',
  {
    defaultMessage:
      'Please provide an input for the unsolved conflict. You can also keep the current without the updates, or accept the Elastic update but lose your modifications.',
  }
);

export const RULE_HAS_SOLVABLE_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSolvableConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} {count, plural, one {field has a solved conflict} other {fields have solved conflicts}}. Please review the final update.',
    }
  );

export const RULE_HAS_SOLVABLE_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSolvableConflictsDescription',
  {
    defaultMessage:
      'Please review and accept solved conflicts. You can also keep the current without the updates, or accept the Elastic update but lose your modifications.',
  }
);

export const RULE_IS_READY_FOR_UPGRADE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleIsReadyForUpgradeDescription',
  {
    defaultMessage: 'There are no conflicts and the update is ready to be applied.',
  }
);
