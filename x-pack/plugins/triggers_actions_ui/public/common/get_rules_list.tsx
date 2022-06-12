/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RulesList } from '../application/sections';
import type { RulesListProps } from '../application/sections/rules_list/components/rules_list';

export const getRulesListLazy = (props: RulesListProps) => {
  return <RulesList {...props} />;
};
