/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleEventLogList } from '../application/sections';
import type {
  RuleEventLogListProps,
  RuleEventLogListOptions,
} from '../application/sections/rule_details/components/rule_event_log_list';

export const getRuleEventLogListLazy = <T extends RuleEventLogListOptions = 'default'>(
  props: RuleEventLogListProps<T>
) => {
  return <RuleEventLogList {...props} />;
};
