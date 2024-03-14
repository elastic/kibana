/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useObservabilityRouter } from '../../../../hooks/use_router';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../hooks/use_kibana';

export function GlobalLogsTab() {
  const {
    triggersActionsUi: { getGlobalRuleEventLogList: GlobalRuleEventLogList },
  } = useKibana().services;
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { link } = useObservabilityRouter();

  return (
    <GlobalRuleEventLogList
      filteredRuleTypes={filteredRuleTypes}
      localStorageKey="observability:global-rule-event-log-list"
      getRuleDetailsRoute={(ruleId) => link('/alerts/rules/{ruleId}', { path: { ruleId } })}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { GlobalLogsTab as default };
