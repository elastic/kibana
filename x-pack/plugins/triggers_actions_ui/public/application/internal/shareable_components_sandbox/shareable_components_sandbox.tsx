/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleStatusDropdownSandbox } from './rule_status_dropdown_sandbox';
import { RuleTagFilterSandbox } from './rule_tag_filter_sandbox';
import { RuleStatusFilterSandbox } from './rule_status_filter_sandbox';
import { RuleTagBadgeSandbox } from './rule_tag_badge_sandbox';

export const InternalShareableComponentsSandbox: React.FC<{}> = () => {
  return (
    <>
      <RuleStatusDropdownSandbox />
      <RuleTagFilterSandbox />
      <RuleStatusFilterSandbox />
      <RuleTagBadgeSandbox />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InternalShareableComponentsSandbox as default };
