/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorScheduling, SyncJobType } from '../../../../../../common/types/connectors';
import { Actions } from '../../../../shared/api_logic/create_api_logic';

import {
  UpdateConnectorSchedulingApiLogic,
  UpdateConnectorSchedulingArgs,
} from '../../../api/connector/update_connector_scheduling_api_logic';

type ConnectorSchedulingActions = Pick<
  Actions<UpdateConnectorSchedulingArgs, ConnectorScheduling>,
  'apiSuccess'
> & {
  clearHasChanges: (type: SyncJobType) => { type: SyncJobType };
  makeRequest: typeof UpdateConnectorSchedulingApiLogic.actions.makeRequest;
  setHasChanges: (type: SyncJobType) => { type: SyncJobType };
  updateScheduling: (
    type: SyncJobType,
    payload: UpdateConnectorSchedulingArgs
  ) => { payload: UpdateConnectorSchedulingArgs; type: SyncJobType };
};

interface ConnectorSchedulingValues {
  hasAccessSyncChanges: boolean;
  hasChanges: boolean;
  hasFullSyncChanges: boolean;
  hasIncrementalSyncChanges: boolean;
  makeRequestType: SyncJobType | null;
}

export const ConnectorSchedulingLogic = kea<
  MakeLogicType<ConnectorSchedulingValues, ConnectorSchedulingActions>
>({
  actions: {
    clearHasChanges: (type) => ({ type }),
    setHasChanges: (type) => ({ type }),
    updateScheduling: (type, payload) => ({ payload, type }),
  },
  connect: {
    actions: [UpdateConnectorSchedulingApiLogic, ['apiSuccess', 'makeRequest']],
  },
  listeners: ({ actions, values }) => ({
    apiSuccess: () => {
      if (values.makeRequestType) {
        actions.clearHasChanges(values.makeRequestType);
      }
    },
    updateScheduling: ({ payload }) => {
      actions.makeRequest(payload);
    },
  }),
  reducers: {
    hasAccessSyncChanges: [
      false,
      {
        clearHasChanges: (current, { type }) =>
          type === SyncJobType.ACCESS_CONTROL ? false : current,
        setHasChanges: (current, { type }) =>
          type === SyncJobType.ACCESS_CONTROL ? true : current,
      },
    ],
    hasFullSyncChanges: [
      false,
      {
        clearHasChanges: (current, { type }) => (type === SyncJobType.FULL ? false : current),
        setHasChanges: (current, { type }) => (type === SyncJobType.FULL ? true : current),
      },
    ],
    hasIncrementalSyncChanges: [
      false,
      {
        clearHasChanges: (current, { type }) =>
          type === SyncJobType.INCREMENTAL ? false : current,
        setHasChanges: (current, { type }) => (type === SyncJobType.INCREMENTAL ? true : current),
      },
    ],
    makeRequestType: [
      null,
      {
        updateScheduling: (_, { type }) => type,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    hasChanges: [
      () => [
        selectors.hasFullSyncChanges,
        selectors.hasAccessSyncChanges,
        selectors.hasIncrementalSyncChanges,
      ],
      (
        hasFullSyncChanges: boolean,
        hasAccessSyncChanges: boolean,
        hasIncrementalSyncChanges: boolean
      ) => {
        return hasFullSyncChanges || hasAccessSyncChanges || hasIncrementalSyncChanges;
      },
    ],
  }),
});
