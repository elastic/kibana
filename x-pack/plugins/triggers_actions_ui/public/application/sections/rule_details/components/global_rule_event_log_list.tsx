/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { RuleEventLogListTable, RuleEventLogListCommonProps } from './rule_event_log_list_table';
import { useKibana } from '../../../../common/lib/kibana';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export interface GlobalRuleEventLogListProps {
  setHeaderActions?: RuleEventLogListCommonProps['setHeaderActions'];
  localStorageKey?: RuleEventLogListCommonProps['localStorageKey'];
  filteredRuleTypes?: RuleEventLogListCommonProps['filteredRuleTypes'];
  getRuleDetailsRoute?: RuleEventLogListCommonProps['getRuleDetailsRoute'];
}

const GLOBAL_EVENT_LOG_LIST_STORAGE_KEY =
  'xpack.triggersActionsUI.globalEventLogList.initialColumns';

const REFRESH_TOKEN = {
  resolve: () => {
    /* noop */
  },
  reject: () => {
    /* noop */
  },
};

export const GlobalRuleEventLogList = (props: GlobalRuleEventLogListProps) => {
  const { setHeaderActions, localStorageKey, filteredRuleTypes, getRuleDetailsRoute } = props;
  const { spaces } = useKibana().services;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SpacesContextWrapper = useCallback(
    spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spaces]
  );

  return (
    <SpacesContextWrapper feature="triggersActions">
      <RuleEventLogListTable
        ruleId={'*'}
        refreshToken={REFRESH_TOKEN}
        initialPageSize={50}
        hasRuleNames={true}
        hasAllSpaceSwitch={true}
        localStorageKey={localStorageKey || GLOBAL_EVENT_LOG_LIST_STORAGE_KEY}
        filteredRuleTypes={filteredRuleTypes}
        setHeaderActions={setHeaderActions}
        getRuleDetailsRoute={getRuleDetailsRoute}
      />
    </SpacesContextWrapper>
  );
};

// eslint-disable-next-line import/no-default-export
export { GlobalRuleEventLogList as default };
