/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleStatusDropdownSandbox } from './rule_status_dropdown_sandbox';
import { RuleTagsBadgeSandbox } from './rule_tags_badge_sandbox';

export const InternalShareableComponentsSandbox: React.FC<{}> = () => {
  return (
    <>
      <RuleStatusDropdownSandbox />
      <RuleTagsBadgeSandbox />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InternalShareableComponentsSandbox as default };
