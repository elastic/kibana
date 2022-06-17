/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy, ReactElement } from 'react';
import { suspendedComponentWithProps } from '../application/lib/suspended_component_with_props';
import type {
  RuleTagBadgeProps,
  RuleTagBadgeOptions,
} from '../application/sections/rules_list/components/rule_tag_badge';

export const getRuleTagBadgeLazy = <T extends RuleTagBadgeOptions = 'default'>(
  props: RuleTagBadgeProps<T>
) => {
  return suspendedComponentWithProps<RuleTagBadgeProps<T>>(
    lazy(() => import('../application/sections/rules_list/components/rule_tag_badge'))
  ) as unknown as ReactElement<RuleTagBadgeProps<T>>;
};
