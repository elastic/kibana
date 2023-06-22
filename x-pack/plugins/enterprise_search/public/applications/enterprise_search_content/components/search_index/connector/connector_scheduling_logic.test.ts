/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { SyncJobType } from '../../../../../../common/types/connectors';

import { ConnectorSchedulingLogic } from './connector_scheduling_logic';

describe('ConnectorSchedulingLogic', () => {
  const { mount } = new LogicMounter(ConnectorSchedulingLogic);
  const DEFAULT_VALUES = {
    hasAccessSyncChanges: false,
    hasChanges: false,
    hasFullSyncChanges: false,
    hasIncrementalSyncChanges: false,
    makeRequestType: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });
  it('has expected default values', () => {
    expect(ConnectorSchedulingLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hasFullSyncChanges', () => {
      const expectedChanges = {
        [SyncJobType.FULL]: {
          hasFullSyncChanges: true,
        },

        [SyncJobType.INCREMENTAL]: {
          hasIncrementalSyncChanges: true,
        },

        [SyncJobType.ACCESS_CONTROL]: {
          hasAccessSyncChanges: true,
        },
      };
      [SyncJobType.FULL, SyncJobType.INCREMENTAL, SyncJobType.ACCESS_CONTROL].forEach((type) => {
        it(`sets related flag when setHasChanges called with ${type} `, () => {
          ConnectorSchedulingLogic.actions.setHasChanges(type);
          expect(ConnectorSchedulingLogic.values).toEqual({
            ...DEFAULT_VALUES,
            hasChanges: true,
            ...expectedChanges[type],
          });
        });
        it(`sets related flag false when clearHasChanges called with ${type}`, () => {
          ConnectorSchedulingLogic.actions.setHasChanges(type);
          expect(ConnectorSchedulingLogic.values).toEqual({
            ...DEFAULT_VALUES,
            hasChanges: true,
            ...expectedChanges[type],
          });
          ConnectorSchedulingLogic.actions.clearHasChanges(type);
          expect(ConnectorSchedulingLogic.values).toEqual({
            ...DEFAULT_VALUES,
          });
        });
      });
    });
  });
});
