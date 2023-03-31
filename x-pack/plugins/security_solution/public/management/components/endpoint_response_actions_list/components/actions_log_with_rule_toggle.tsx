/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { FILTER_NAMES } from '../translations';

interface ActionsLogWithRuleToggleProps {
  isFlyout: boolean;
  dataTestSubj?: string;
}

export const ActionsLogWithRuleToggle = React.memo(
  ({ isFlyout, dataTestSubj }: ActionsLogWithRuleToggleProps) => {
    const responseActionsEnabled = useIsExperimentalFeatureEnabled(
      'endpointResponseActionsEnabled'
    );

    const { withAutomatedActions: withAutomatedActionsUrlParam, setUrlWithAutomatedActions } =
      useActionHistoryUrlParams();

    const onClick = useCallback(() => {
      if (!isFlyout) {
        // set and show `withAutomatedActions` URL param on history page
        setUrlWithAutomatedActions(!withAutomatedActionsUrlParam);
      }
    }, [isFlyout, setUrlWithAutomatedActions, withAutomatedActionsUrlParam]);

    if (!responseActionsEnabled) return null;

    return (
      <EuiFilterButton
        hasActiveFilters={withAutomatedActionsUrlParam}
        onClick={onClick}
        data-test-subj={`${dataTestSubj}-automated-responses-filter`}
      >
        {FILTER_NAMES.automated}
      </EuiFilterButton>
    );
  }
);

ActionsLogWithRuleToggle.displayName = 'ActionsLogWithRuleToggle';
