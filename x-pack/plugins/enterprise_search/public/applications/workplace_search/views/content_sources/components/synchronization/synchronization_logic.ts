/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import moment from 'moment';

export type TabId = 'source_sync_frequency' | 'blocked_time_windows';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  getContentSourcePath,
} from '../../../../routes';
import { BlockedWindow } from '../../../../types';

import { SourceLogic } from '../../source_logic';

interface SynchronizationActions {
  setNavigatingBetweenTabs(navigatingBetweenTabs: boolean): boolean;
  handleSelectedTabChanged(tabId: TabId): TabId;
  addBlockedWindow(): void;
}

interface SynchronizationValues {
  hasUnsavedChanges: boolean;
  navigatingBetweenTabs: boolean;
  blockedWindows: BlockedWindow[];
}

export const emptyBlockedWindow: BlockedWindow = {
  jobType: 'full',
  day: 'monday',
  start: moment().set('hour', 11).set('minutes', 0),
  end: moment().set('hour', 13).set('minutes', 0),
};

export const SynchronizationLogic = kea<
  MakeLogicType<SynchronizationValues, SynchronizationActions>
>({
  actions: {
    setNavigatingBetweenTabs: (navigatingBetweenTabs: boolean) => navigatingBetweenTabs,
    handleSelectedTabChanged: (tabId: TabId) => tabId,
    addBlockedWindow: true,
  },
  reducers: {
    navigatingBetweenTabs: [
      false,
      {
        setNavigatingBetweenTabs: (_, navigatingBetweenTabs) => navigatingBetweenTabs,
      },
    ],
    blockedWindows: [
      [],
      {
        addBlockedWindow: (state, _) => [...state, emptyBlockedWindow],
      },
    ],
  },
  listeners: ({ actions }) => ({
    handleSelectedTabChanged: async (tabId, breakpoint) => {
      const { isOrganization } = AppLogic.values;
      const { id: sourceId } = SourceLogic.values.contentSource;
      const path =
        tabId === 'source_sync_frequency'
          ? getContentSourcePath(SYNC_FREQUENCY_PATH, sourceId, isOrganization)
          : getContentSourcePath(BLOCKED_TIME_WINDOWS_PATH, sourceId, isOrganization);

      // This method is needed because the shared `UnsavedChangesPrompt` component is triggered
      // when navigating between tabs. We set a boolean flag that tells the prompt there are no
      // unsaved changes when navigating between the tabs and reset it one the transition is complete
      // in order to restore the intended functionality when navigating away with unsaved changes.
      actions.setNavigatingBetweenTabs(true);

      await breakpoint();

      KibanaLogic.values.navigateToUrl(path);
      actions.setNavigatingBetweenTabs(false);
    },
  }),
});
