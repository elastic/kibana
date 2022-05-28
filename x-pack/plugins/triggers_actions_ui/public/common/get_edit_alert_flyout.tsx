/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleEdit } from '../application/sections/rule_form';
import type { RuleEditProps as AlertEditProps } from '../types';

export const getEditAlertFlyoutLazy = (props: AlertEditProps) => {
  return <RuleEdit {...props} />;
};
