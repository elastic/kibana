/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DryRunResult } from './use_bulk_actions_dry_run';
import {
  BULK_ACTIONS_DRY_RUN_EDIT_MACHINE_LEARNING_INDEX_ERROR_MSG,
  BULK_ACTIONS_DRY_RUN_IMMUTABLE_ERROR_MSG,
} from '../../../../../../../common/constants';

interface BulkEditRuleErrorsListProps {
  ruleErrors: DryRunResult['ruleErrors'];
}

const BulkEditRuleErrorsListComponent = ({ ruleErrors = [] }: BulkEditRuleErrorsListProps) => {
  if (ruleErrors.length === 0) {
    return null;
  }

  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.actionRejectionDescription"
        defaultMessage="This action can't be applied to the following rules:"
      />
      <EuiSpacer />
      <ul>
        {ruleErrors.map(({ message, ruleIds }) => {
          const rulesCount = ruleIds.length;
          switch (message) {
            case BULK_ACTIONS_DRY_RUN_IMMUTABLE_ERROR_MSG:
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.elasticRulesEditDescription"
                    defaultMessage="{rulesCount, plural, =1 {# prebuild Elastic rule} other {# prebuild Elastic rules}} (editing prebuilt rules is not supported)"
                    values={{ rulesCount }}
                  />
                </li>
              );
            case BULK_ACTIONS_DRY_RUN_EDIT_MACHINE_LEARNING_INDEX_ERROR_MSG:
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.machineLearningRulesIndexEditDescription"
                    defaultMessage="{rulesCount, plural, =1 {# custom Machine Learning rule} other {# custom Machine Learning rules}} (these rules don't have index patterns)"
                    values={{ rulesCount }}
                  />
                </li>
              );
            default:
              return (
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.defaultRulesEditFailureDescription"
                    defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} can't be edited due to error: {message}"
                    values={{ rulesCount, message }}
                  />
                </li>
              );
          }
        })}
      </ul>
    </>
  );
};

export const BulkEditRuleErrorsList = React.memo(BulkEditRuleErrorsListComponent);

BulkEditRuleErrorsList.displayName = 'BulkEditRuleErrorsList';
