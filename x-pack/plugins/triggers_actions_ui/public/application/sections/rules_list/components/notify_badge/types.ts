/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTableItem, SnoozeSchedule } from '../../../../../types';

export interface RulesListNotifyBadgeProps {
  rule: Pick<
    RuleTableItem,
    'id' | 'activeSnoozes' | 'isSnoozedUntil' | 'muteAll' | 'isEditable' | 'snoozeSchedule'
  >;
  isOpen: boolean;
  isLoading: boolean;
  previousSnoozeInterval?: string | null;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onClose: () => void;
  onLoading: (isLoading: boolean) => void;
  onRuleChanged: () => void;
  snoozeRule: (schedule: SnoozeSchedule, muteAll?: boolean) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  showTooltipInline?: boolean;
  showOnHover?: boolean;
}

export type RulesListNotifyBadgePropsWithApi = Omit<
  RulesListNotifyBadgeProps,
  | 'isOpen'
  | 'previousSnoozeInterval'
  | 'onClick'
  | 'onClose'
  | 'onLoading'
  | 'showOnHover'
  | 'showTooltipInline'
  | 'snoozeRule'
  | 'unsnoozeRule'
>;
