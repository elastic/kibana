/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';
import { ConditionEntry } from './condition_entry';

interface ConditionGroupProps {
  os: TrustedApp['os'];
  entries: TrustedApp['entries'];
}
export const ConditionGroup = memo<ConditionGroupProps>(({ os, entries }) => {
  return entries.map((entry) => <ConditionEntry os={os} entry={entry} />);
});

ConditionGroup.displayName = 'ConditionGroup';
