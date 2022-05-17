/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleConfigurationExplanation } from '@kbn/alerting-plugin/common/rule';
import { InitialRule } from './rule_reducer';
import { explainRule } from '../../lib/rule_api';
import { useKibana } from '../../../common/lib/kibana';
import { IErrorObject } from '../../../types';
import { hasObjectErrors } from './rule_errors';

interface RuleExplanationProps {
  rule: InitialRule;
  errors: IErrorObject;
}

export const RuleExplanation = ({ rule, errors }: RuleExplanationProps) => {
  const {
    notifications: { toasts },
    http,
  } = useKibana().services;

  const [ruleConfigurationExplanation, setRuleConfigurationExplanation] = useState<
    RuleConfigurationExplanation | undefined
  >(undefined);

  const hasErrors = useMemo(() => {
    return hasObjectErrors(errors);
  }, [errors]);

  // TODO: Should avoid race conditions by using only the latest result.
  // TODO: Should be debounced.
  const fetchRuleExplanation = useCallback(async () => {
    if (hasErrors) return;

    try {
      const configurationExplanationResult = await explainRule({
        http,
        rule,
      });
      setRuleConfigurationExplanation(configurationExplanationResult);
    } catch (errorRes) {
      toasts.addDanger(
        errorRes.body?.message ??
          i18n.translate(
            'xpack.triggersActionsUI.sections.ruleExplain.ruleConfigurationExplanationError',
            {
              defaultMessage: 'Could not explain the rule configuration.',
            }
          )
      );
    }
  }, [http, toasts, rule, hasErrors]);

  useEffect(() => {
    fetchRuleExplanation();
  }, [rule, fetchRuleExplanation]);

  if (hasErrors) {
    return (
      <p>
        {i18n.translate('xpack.triggersActionsUI.sections.ruleExplain.hasErrorsMessage', {
          defaultMessage: 'Please amend configuration errors',
        })}
      </p>
    );
  }

  if (!ruleConfigurationExplanation) {
    return null;
  }

  return (
    // TODO: Needs all loading states etc
    // TODO: Child components should be split in to new per type directories, just jamming it all in here for now.
    // TODO: The HTML elements etc here are garbage, should be tidied up.
    // TODO: Add a copy to clipboard
    // TODO: Potentially add a link to Dev Tools
    <>
      {ruleConfigurationExplanation.type === 'ES_QUERY' ? (
        <>
          <p>
            {`This rule would produce ${ruleConfigurationExplanation.queries.length} Elasticsearch
            queries`}
          </p>
          <ul>
            {ruleConfigurationExplanation.queries.map((query, index) => {
              return (
                <li key={index}>
                  <p>{query.annotation}</p>
                  <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
                    {query.query}
                  </EuiCodeBlock>
                </li>
              );
            })}
          </ul>
        </>
      ) : undefined}
    </>
  );
};
