/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleAdd } from '../application/sections/rule_form';
import type { RuleAddProps as AlertAddProps } from '../types';

export const getAddAlertFlyoutLazy = (props: AlertAddProps) => {
  return <RuleAdd {...props} />;
};
