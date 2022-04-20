/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleStateFilter } from '../application/sections';
import type { RuleStateFilterProps } from '../application/sections/rules_list/components/rule_state_filter';

export const getRuleStateFilterLazy = (props: RuleStateFilterProps) => {
  return <RuleStateFilter {...props} />;
};
