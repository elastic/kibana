/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsEnhancedUrlDrilldownTriggerDefinition } from '../../../ui_actions_enhanced/public';
import { SELECT_RANGE_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import {
  ChartActionContext,
  isRangeSelectTriggerContext,
  RangeSelectTriggerContext,
} from '../../../../../src/plugins/embeddable/public';

interface SelectRangeEventScope {
  from: string;
  to: string;
  key: string;
  negate: boolean;
}

export const embeddableUrlDrilldownSelectRangeTrigger: UiActionsEnhancedUrlDrilldownTriggerDefinition<
  typeof SELECT_RANGE_TRIGGER,
  SelectRangeEventScope
> = {
  triggerId: SELECT_RANGE_TRIGGER,
  isTriggerContext(context: object): boolean {
    return isRangeSelectTriggerContext((context as unknown) as ChartActionContext);
  },
  getScopeForPreview(): SelectRangeEventScope {
    return {
      from: '__testFrom__',
      to: '__testFrom__',
      key: '__testKey__',
      negate: false,
    };
  },
  getScopeFromActionContext(context: RangeSelectTriggerContext): SelectRangeEventScope {
    // TODO: map here to proper scope
    return {
      from: '__testFrom__',
      to: '__testTo__',
      key: '__testKey__',
      negate: false,
    };
  },
};
