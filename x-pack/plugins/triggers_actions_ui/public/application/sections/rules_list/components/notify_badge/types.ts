/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTableItem, SnoozeSchedule } from '../../../../../types';

export type RuleSnoozeSettings = Pick<
  RuleTableItem,
  'id' | 'activeSnoozes' | 'isSnoozedUntil' | 'muteAll' | 'snoozeSchedule'
>;

export interface RulesListNotifyBadgeProps {
  /**
   *  Rule's snooze settings, if `undefined` is passed the component is shown in loading state
   */
  snoozeSettings: RuleSnoozeSettings | undefined;
  /**
   * Whether the component is disabled or not, string give a disabled reason displayed as a tooltip
   */
  disabled?: boolean | string;
  onRuleChanged: () => void;
  snoozeRule: (schedule: SnoozeSchedule, muteAll?: boolean) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  showTooltipInline?: boolean;
  showOnHover?: boolean;
}

export type RulesListNotifyBadgePropsWithApi = Pick<
  RulesListNotifyBadgeProps,
  'snoozeSettings' | 'disabled' | 'onRuleChanged' | 'showOnHover' | 'showTooltipInline'
>;
