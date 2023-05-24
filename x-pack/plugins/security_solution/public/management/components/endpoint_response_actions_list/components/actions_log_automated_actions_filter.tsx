/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { FILTER_NAMES } from '../translations';

interface ActionsLogWithRuleToggleProps {
  dataTestSubj?: string;
  onChangeWithAutomatedActionsFilter: () => void;
  isFlyout: boolean;
}
export const AutomatedActionsFilter = React.memo(
  ({
    dataTestSubj,
    onChangeWithAutomatedActionsFilter,
    isFlyout,
  }: ActionsLogWithRuleToggleProps) => {
    const { withAutomatedActions: withAutomatedActionsUrlParam, setUrlWithAutomatedActions } =
      useActionHistoryUrlParams();
    const [value, setValue] = useState(withAutomatedActionsUrlParam);

    const onClick = useCallback(() => {
      if (!isFlyout) {
        setUrlWithAutomatedActions(!withAutomatedActionsUrlParam);
      }
      setValue((prevState) => !prevState);
      onChangeWithAutomatedActionsFilter();
    }, [
      isFlyout,
      onChangeWithAutomatedActionsFilter,
      setUrlWithAutomatedActions,
      withAutomatedActionsUrlParam,
    ]);

    return (
      <EuiFilterButton
        hasActiveFilters={value}
        onClick={onClick}
        data-test-subj={`${dataTestSubj}-automated-responses-filter`}
      >
        {FILTER_NAMES.automated}
      </EuiFilterButton>
    );
  }
);

AutomatedActionsFilter.displayName = 'AutomatedActionsFilter';
