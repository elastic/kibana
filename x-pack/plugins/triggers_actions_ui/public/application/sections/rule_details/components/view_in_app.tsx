/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from 'kibana/public';
import { fromNullable, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  RuleNavigation,
  RuleStateNavigation,
  RuleUrlNavigation,
} from '../../../../../../alerting/common';
import { Rule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';

export interface ViewInAppProps {
  rule: Rule;
}

const NO_NAVIGATION = false;

type RuleNavigationLoadingState = RuleNavigation | false | null;

export const ViewInApp: React.FunctionComponent<ViewInAppProps> = ({ rule }) => {
  const {
    application: { navigateToApp },
    alerting: maybeAlerting,
  } = useKibana().services;

  const [ruleNavigation, setRuleNavigation] = useState<RuleNavigationLoadingState>(null);
  useEffect(() => {
    pipe(
      fromNullable(maybeAlerting),
      fold(
        /**
         * If the ruleing plugin is disabled,
         * navigation isn't supported
         */
        () => setRuleNavigation(NO_NAVIGATION),
        (ruleing) => {
          return ruleing
            .getNavigation(rule.id)
            .then((nav) => (nav ? setRuleNavigation(nav) : setRuleNavigation(NO_NAVIGATION)))
            .catch(() => {
              setRuleNavigation(NO_NAVIGATION);
            });
        }
      )
    );
  }, [rule.id, maybeAlerting]);

  return (
    <EuiButtonEmpty
      data-test-subj="ruleDetails-viewInApp"
      isLoading={ruleNavigation === null}
      disabled={!hasNavigation(ruleNavigation)}
      iconType="popout"
      {...getNavigationHandler(ruleNavigation, rule, navigateToApp)}
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.ruleDetails.viewRuleInAppButtonLabel"
        defaultMessage="View in app"
      />
    </EuiButtonEmpty>
  );
};

function hasNavigation(
  ruleNavigation: RuleNavigationLoadingState
): ruleNavigation is RuleStateNavigation | RuleUrlNavigation {
  return ruleNavigation
    ? ruleNavigation.hasOwnProperty('state') || ruleNavigation.hasOwnProperty('path')
    : NO_NAVIGATION;
}

function getNavigationHandler(
  ruleNavigation: RuleNavigationLoadingState,
  rule: Rule,
  navigateToApp: CoreStart['application']['navigateToApp']
): object {
  return hasNavigation(ruleNavigation)
    ? {
        onClick: () => {
          navigateToApp(rule.consumer, ruleNavigation);
        },
      }
    : {};
}
