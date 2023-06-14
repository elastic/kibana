/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiIcon, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import find from 'lodash/find';
import React, { useMemo, type FC } from 'react';

import { useRightPanelContext } from '../context';

const TEST_ID = 'TODO' as const;

const SESSION_PREVIEW_TITLE = 'Session viewer preview' as const;

const FIELD_USER_NAME = 'process.entry_leader.user.name' as const;
const FIELD_USER_ID = 'process.entry_leader.user.id' as const;
const FIELD_PROCESS_NAME = 'process.entry_leader.name' as const;
const FIELD_START_AT = 'process.entry_leader.start' as const;
const FIELD_RULE = 'kibana.alert.rule.name' as const;
const FIELD_WORKING_DIRECTORY = 'process.group_leader.working_directory' as const;
const FIELD_COMMAND = 'process.command_line' as const;

const getFieldValue = (
  data: TimelineEventsDetailsItem[] | null,
  field: string
): string | undefined => find(data, { field })?.values?.join(' ');

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

const useProcessData = () => {
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

export const SessionPreview: FC = () => {
  const { processName, userName, startAt, rule, workdir, command } = useProcessData();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder={true} paddingSize="none" data-test-subj={TEST_ID}>
      <EuiPanel color="subdued" paddingSize="s">
        <EuiButtonEmpty color="primary" iconType="sessionViewer">
          {SESSION_PREVIEW_TITLE}
        </EuiButtonEmpty>

        <div>
          <EuiIcon type="user" />
          &nbsp;
          <span style={{ fontWeight: euiTheme.font.weight.bold }}>{userName}</span>
          &nbsp;
          <span>started</span>
          &nbsp;
          <span style={{ fontWeight: euiTheme.font.weight.bold }}>{processName}</span>
          &nbsp;
          <span>at</span>
          &nbsp;
          <span>{startAt}</span>
          &nbsp;
          <span>
            with alert <EuiLink>{rule}</EuiLink>
          </span>
          &nbsp;
          <span>by</span>
          &nbsp;
          <span style={{ fontWeight: euiTheme.font.weight.bold }}>
            {workdir} {command}
          </span>
        </div>
      </EuiPanel>
    </EuiPanel>
  );
};
