/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleTagsBadge } from '../application/sections';
import type { RuleTagsBadgeProps } from '../application/sections/rules_list/components/rule_tags_badge';

export const getRuleTagsBadgeLazy = (props: RuleTagsBadgeProps) => {
  return <RuleTagsBadge {...props} />;
};
