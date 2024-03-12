/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import type { RuleAddComponent } from './rule_add';
import type { RuleEditComponent } from './rule_edit';

export const RuleAdd = suspendedComponentWithProps(
  lazy(() => import('./rule_add'))
) as RuleAddComponent; // `React.lazy` is not typed correctly to support generics so casting back to imported component

export const RuleEdit = suspendedComponentWithProps(
  lazy(() => import('./rule_edit'))
) as RuleEditComponent; // `React.lazy` is not typed correctly to support generics so casting back to imported component
