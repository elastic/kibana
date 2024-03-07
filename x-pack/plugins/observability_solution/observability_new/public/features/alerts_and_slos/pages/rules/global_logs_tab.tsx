/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { relativePaths } from '../../../../../common/features/alerts_and_slos/locators/paths';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../hooks/use_kibana';

export function GlobalLogsTab() {
  const {
    triggersActionsUi: { getGlobalRuleEventLogList: GlobalRuleEventLogList },
  } = useKibana().services;
  const filteredRuleTypes = useGetFilteredRuleTypes();

  return (
    <GlobalRuleEventLogList
      filteredRuleTypes={filteredRuleTypes}
      localStorageKey="observability:global-rule-event-log-list"
      getRuleDetailsRoute={relativePaths.observability.ruleDetails}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { GlobalLogsTab as default };
