/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RulesListNotifyBadge } from '../application/sections';
import type { RulesListNotifyBadgeProps } from '../application/sections/rules_list/components/rules_list_notify_badge';

export const getRulesListNotifyBadgeLazy = (props: RulesListNotifyBadgeProps) => {
  return <RulesListNotifyBadge {...props} />;
};
