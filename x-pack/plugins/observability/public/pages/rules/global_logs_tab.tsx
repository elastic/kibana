/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '../../utils/kibana_react';

export function GlobalLogsTab() {
  const {
    triggersActionsUi: { getGlobalRuleEventLogList: GlobalRuleEvenLogList },
  } = useKibana().services;

  return <GlobalRuleEvenLogList />;
}

// eslint-disable-next-line import/no-default-export
export { GlobalLogsTab as default };
