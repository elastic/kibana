/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import find from 'lodash/find';
import { useMemo } from 'react';
import { useRightPanelContext } from '../context';

const FIELD_USER_NAME = 'process.entry_leader.user.name' as const;
const FIELD_USER_ID = 'process.entry_leader.user.id' as const;
const FIELD_PROCESS_NAME = 'process.entry_leader.name' as const;
const FIELD_START_AT = 'process.entry_leader.start' as const;
const FIELD_RULE = 'kibana.alert.rule.name' as const;
const FIELD_WORKING_DIRECTORY = 'process.group_leader.working_directory' as const;
const FIELD_COMMAND = 'process.command_line' as const;

/**
 * An universal way to retrieve field values in this component
 */
const getFieldValue = (
  data: TimelineEventsDetailsItem[] | null,
  field: string
): string | undefined => find(data, { field })?.values?.join(' ');

/**
 * Returns user name with some fallback logic in case it is not available. The idea was borrowed from session viewer
 */
const getUserDisplayName = (data: TimelineEventsDetailsItem[] | null): string => {
  const userName = getFieldValue(data, FIELD_USER_NAME);
  const userId = getFieldValue(data, FIELD_USER_ID);

  if (userName) {
    return userName;
  }

  if (!userId) {
    return 'unknown';
  }

  return userId === '0' ? 'root' : `uid: ${userId}`;
};

/**
 * Returns memoized process-related values for the session preview component
 */
export const useProcessData = () => {
  const { dataFormattedForFieldBrowser: data } = useRightPanelContext();

  return useMemo(
    () => ({
      userName: getUserDisplayName(data),
      processName: getFieldValue(data, FIELD_PROCESS_NAME),
      startAt: getFieldValue(data, FIELD_START_AT),
      rule: getFieldValue(data, FIELD_RULE),
      workdir: getFieldValue(data, FIELD_WORKING_DIRECTORY),
      command: getFieldValue(data, FIELD_COMMAND),
    }),
    [data]
  );
};
