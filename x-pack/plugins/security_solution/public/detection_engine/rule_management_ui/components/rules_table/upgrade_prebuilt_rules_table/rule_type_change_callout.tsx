/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import {
  RULE_TYPE_CHANGE_CALLOUT_DESCRIPTION,
  RULE_TYPE_CHANGE_CALLOUT_TITLE,
} from './translations';

export const RuleTypeChangeCallout = () => {
  return (
    <EuiCallOut title={RULE_TYPE_CHANGE_CALLOUT_TITLE} color="danger" iconType="warning">
      <p>{RULE_TYPE_CHANGE_CALLOUT_DESCRIPTION}</p>
    </EuiCallOut>
  );
};
