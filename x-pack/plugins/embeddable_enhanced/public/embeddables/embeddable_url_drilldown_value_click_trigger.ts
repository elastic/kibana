/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsEnhancedUrlDrilldownTriggerDefinition } from '../../../ui_actions_enhanced/public';
import { VALUE_CLICK_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import {
  ChartActionContext,
  isValueClickTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../src/plugins/embeddable/public';

interface ValueClickEventScope {
  value: string;
  key: string;
  negate: boolean;
}

export const embeddableUrlDrilldownValueClickTrigger: UiActionsEnhancedUrlDrilldownTriggerDefinition<
  typeof VALUE_CLICK_TRIGGER,
  ValueClickEventScope
> = {
  triggerId: VALUE_CLICK_TRIGGER,
  isTriggerContext(context: object): boolean {
    return isValueClickTriggerContext((context as unknown) as ChartActionContext);
  },
  getScopeForPreview(): ValueClickEventScope {
    return {
      value: '__testValue__',
      key: '__testKey__',
      negate: false,
    };
  },
  getScopeFromActionContext(context: ValueClickTriggerContext): ValueClickEventScope {
    // TODO: map here to proper scope
    return {
      value: '__testValue__',
      key: '__testKey__',
      negate: false,
    };
  },
};
