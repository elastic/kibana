/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentRequestAlertType } from '../../../common/api';
import type { Ecs } from '../../../common';
import { CommentType } from '../../../common';
import { getRuleIdFromEvent } from './get_rule_id_from_event';
import type { CaseAttachmentsWithoutOwner } from '../../types';

type Maybe<T> = T | null;
interface Event {
  data: EventNonEcsData[];
  ecs: Ecs;
}
interface EventNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

type CommentRequestAlertTypeWithoutOwner = Omit<CommentRequestAlertType, 'owner'>;

export const groupAlertsByRule = (items: Event[]): CaseAttachmentsWithoutOwner => {
  const attachmentsByRule = items.reduce<Record<string, CommentRequestAlertTypeWithoutOwner>>(
    (acc, item) => {
      const rule = getRuleIdFromEvent(item);
      if (!acc[rule.id]) {
        acc[rule.id] = {
          alertId: [],
          index: [],
          type: CommentType.alert as const,
          rule,
        };
      }
      const alerts = acc[rule.id].alertId;
      const indexes = acc[rule.id].index;
      if (Array.isArray(alerts) && Array.isArray(indexes)) {
        alerts.push(item.ecs._id ?? '');
        indexes.push(item.ecs._index ?? '');
      }
      return acc;
    },
    {}
  );
  return Object.values(attachmentsByRule);
};
