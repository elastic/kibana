/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import { RuleEventLogListWithApi } from '../../rule_details/components/rule_event_log_list';

export const LogsList = () => {
  const refreshToken = 0;

  return suspendedComponentWithProps(
    RuleEventLogListWithApi,
    'xl'
  )({
    fetchRuleSummary: false,
    hideChart: true,
    ruleId: '*',
    ruleType: '',
    ruleSummary: '',
    numberOfExecutions: 0,
    refreshToken,
    isLoadingRuleSummary: false,
    onChangeDuration: () => {},
    requestRefresh: async () => {},
  });
};

// eslint-disable-next-line import/no-default-export
export default LogsList;
