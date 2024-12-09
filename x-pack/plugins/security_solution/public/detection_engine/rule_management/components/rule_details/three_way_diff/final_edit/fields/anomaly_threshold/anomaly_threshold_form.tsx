/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { AnomalyThresholdAdapter } from './anomaly_threshold_adapter';

export function AnomalyThresholdForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper component={AnomalyThresholdAdapter} ruleFieldFormSchema={schema} />
  );
}

const schema = {};
