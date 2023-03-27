/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton } from '@elastic/eui';
import React from 'react';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { FILTER_NAMES } from '../translations';

interface ActionsLogWithRuleToggleProps {
  isFlyout: boolean;
  getTestId: (id?: string) => string | undefined;
}

export const ActionsLogWithRuleToggle = ({
  isFlyout,
  getTestId,
}: ActionsLogWithRuleToggleProps) => {
  const { withRuleActions: withRuleActionsUrlParam, setUrlWithRuleActions } =
    useActionHistoryUrlParams();

  const onClick = () => {
    if (!isFlyout) {
      // set and show `withRuleActions` URL param on history page
      setUrlWithRuleActions(!withRuleActionsUrlParam);
    }
  };

  return (
    <EuiFilterButton
      hasActiveFilters={withRuleActionsUrlParam}
      onClick={onClick}
      data-test-subj={getTestId('automated-responses-filter')}
    >
      {FILTER_NAMES.automated}
    </EuiFilterButton>
  );
};
