/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { GetFieldsData } from '../../../common/hooks/use_get_fields_data';
import { getField } from '../../shared/utils';
import { useRightPanelContext } from '../context';

const FIELD_USER_NAME = 'process.entry_leader.user.name' as const;
const FIELD_USER_ID = 'process.entry_leader.user.id' as const;
const FIELD_PROCESS_NAME = 'process.entry_leader.name' as const;
const FIELD_START_AT = 'process.entry_leader.start' as const;
const FIELD_WORKING_DIRECTORY = 'process.group_leader.working_directory' as const;
const FIELD_COMMAND = 'process.command_line' as const;

/**
 * Returns user name with some fallback logic in case it is not available. The idea was borrowed from session viewer
 */
export const getUserDisplayName = (getFieldsData: GetFieldsData): string => {
  const userName = getField(getFieldsData(FIELD_USER_NAME));
  const userId = getField(getFieldsData(FIELD_USER_ID));

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
  const { getFieldsData } = useRightPanelContext();

  return useMemo(
    () => ({
      userName: getUserDisplayName(getFieldsData),
      processName: getField(getFieldsData(FIELD_PROCESS_NAME)),
      startAt: getField(getFieldsData(FIELD_START_AT)),
      ruleName: getField(getFieldsData(ALERT_RULE_NAME)),
      ruleId: getField(getFieldsData(ALERT_RULE_UUID)),
      workdir: getField(getFieldsData(FIELD_WORKING_DIRECTORY)),
      command: getField(getFieldsData(FIELD_COMMAND)),
    }),
    [getFieldsData]
  );
};
