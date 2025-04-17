/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import datemath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { ConversationSummary } from '../../../common/conversations';

export interface ConversationGroup {
  dateLabel: string;
  conversations: ConversationSummary[];
}

type ConversationGroupWithDate = ConversationGroup & {
  dateLimit: number;
};

interface ConversationBucketDefinition {
  code: string;
  label: string;
  limit: string | false;
}

export const getDefaultBuckets = (): ConversationBucketDefinition[] => {
  return [
    {
      code: 'TODAY',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.today', {
        defaultMessage: 'Today',
      }),
      limit: 'now/d',
    },
    {
      code: 'YESTERDAY',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.yesterday', {
        defaultMessage: 'Yesterday',
      }),
      limit: 'now-1d/d',
    },
    {
      code: 'LAST_WEEK',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastWeek', {
        defaultMessage: 'Last week',
      }),
      limit: 'now/w',
    },
    {
      code: 'LAST_2_WEEKS',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastTwoWeeks', {
        defaultMessage: 'Last 2 weeks',
      }),
      limit: 'now/2w',
    },
    {
      code: 'LAST_MONTH',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastMonth', {
        defaultMessage: 'Last month',
      }),
      limit: 'now/m',
    },
    {
      code: 'LAST_3_MONTHS',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastThreeMonths', {
        defaultMessage: 'Last 3 months',
      }),
      limit: 'now/3m',
    },
    {
      code: 'LAST_6_MONTHS',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastSixMonths', {
        defaultMessage: 'Last 6 months',
      }),
      limit: 'now/6m',
    },
    {
      code: 'LAST_YEAR',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.lastYear', {
        defaultMessage: 'Last month',
      }),
      limit: 'now/y',
    },
    {
      code: 'OLDER',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.before', {
        defaultMessage: 'Before',
      }),
      limit: false,
    },
  ];
};

/**
 * Sort and group conversation by time period to display them in the ConversationList component.
 */
export const sortAndGroupConversations = (
  conversations: ConversationSummary[],
  buckets: ConversationBucketDefinition[] = getDefaultBuckets(),
  now: Date = new Date()
): ConversationGroup[] => {
  const getEpochLimit = (range: string | false) => {
    if (range === false) {
      return 0;
    }
    return getAbsoluteTime(range, { forceNow: now })?.valueOf() ?? 0;
  };

  const groups = buckets.map(({ label, limit }) => {
    return emptyGroup(label, getEpochLimit(limit));
  });

  conversations
    .map((conversation) => {
      return {
        conversation,
        date: moment(conversation.lastUpdated),
      };
    })
    .sort((conv1, conv2) => {
      return conv2.date.valueOf() - conv1.date.valueOf();
    })
    .forEach(({ conversation, date }) => {
      for (const group of groups) {
        if (date.isAfter(group.dateLimit)) {
          group.conversations.push(conversation);
          break;
        }
      }
    });

  return groups
    .filter((group) => group.conversations.length > 0)
    .map(({ conversations: convs, dateLabel }) => ({ conversations: convs, dateLabel }));
};

const emptyGroup = (label: string, limit: number): ConversationGroupWithDate => ({
  dateLabel: label,
  dateLimit: limit,
  conversations: [],
});

const getAbsoluteTime = (range: string, opts: Parameters<typeof datemath.parse>[1] = {}) => {
  const parsed = datemath.parse(range, opts);

  return parsed?.isValid() ? parsed : undefined;
};
