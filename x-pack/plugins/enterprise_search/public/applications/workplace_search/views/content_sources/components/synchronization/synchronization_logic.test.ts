/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockKibanaValues } from '../../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test/jest';

const contentSource = { id: 'source123' };
jest.mock('../../source_logic', () => ({
  SourceLogic: { values: { contentSource } },
}));

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { SynchronizationLogic, emptyBlockedWindow } from './synchronization_logic';

describe('SynchronizationLogic', () => {
  const { navigateToUrl } = mockKibanaValues;
  const { mount } = new LogicMounter(SynchronizationLogic);

  const defaultValues = {
    navigatingBetweenTabs: false,
    blockedWindows: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SynchronizationLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setNavigatingBetweenTabs', () => {
      SynchronizationLogic.actions.setNavigatingBetweenTabs(true);

      expect(SynchronizationLogic.values.navigatingBetweenTabs).toEqual(true);
    });

    it('addBlockedWindow', () => {
      SynchronizationLogic.actions.addBlockedWindow();

      expect(SynchronizationLogic.values.blockedWindows).toEqual([emptyBlockedWindow]);
    });
  });

  describe('listeners', () => {
    describe('handleSelectedTabChanged', () => {
      it('calls setNavigatingBetweenTabs', async () => {
        const setNavigatingBetweenTabsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'setNavigatingBetweenTabs'
        );
        SynchronizationLogic.actions.handleSelectedTabChanged('source_sync_frequency');
        await nextTick();

        expect(setNavigatingBetweenTabsSpy).toHaveBeenCalledWith(true);
        expect(navigateToUrl).toHaveBeenCalledWith('/sources/source123/synchronization/frequency');
      });

      it('calls calls correct route for "blocked_time_windows"', async () => {
        SynchronizationLogic.actions.handleSelectedTabChanged('blocked_time_windows');
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalledWith(
          '/sources/source123/synchronization/frequency/blocked_windows'
        );
      });
    });
  });
});
