/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { mockHttpValues } from '../../../../__mocks__';
jest.mock('../../../../shared/http', () => ({
  HttpLogic: { values: mockHttpValues },
}));
const { http } = mockHttpValues;

jest.mock('../../../../shared/flash_messages', () => ({
  flashAPIErrors: jest.fn(),
}));
import { flashAPIErrors } from '../../../../shared/flash_messages';

import { ELogRetentionOptions } from './types';
import { LogRetentionLogic } from './log_retention_logic';

describe('LogRetentionLogic', () => {
  const DEFAULT_VALUES = {
    logRetention: null,
    openModal: null,
    logsRetentionUpdating: false,
  };

  const mount = (defaults?: object) => {
    if (!defaults) {
      resetContext({});
    } else {
      resetContext({
        defaults: {
          enterprise_search: {
            app_search: {
              log_retention_logic: {
                ...defaults,
              },
            },
          },
        },
      });
    }
    LogRetentionLogic.mount();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(LogRetentionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setOpenModal', () => {
      describe('openModal', () => {
        it('should be set to the provided value', () => {
          mount();

          LogRetentionLogic.actions.setOpenModal(ELogRetentionOptions.Analytics);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openModal: ELogRetentionOptions.Analytics,
          });
        });
      });
    });

    describe('closeModals', () => {
      describe('openModal', () => {
        it('resets openModal to null', () => {
          mount({
            openModal: 'analytics',
          });

          LogRetentionLogic.actions.closeModals();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openModal: null,
          });
        });
      });

      describe('logsRetentionUpdating', () => {
        it('resets logsRetentionUpdating to false', () => {
          mount({
            logsRetentionUpdating: true,
          });

          LogRetentionLogic.actions.closeModals();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logsRetentionUpdating: false,
          });
        });
      });
    });

    describe('clearLogRetentionUpdating', () => {
      describe('logsRetentionUpdating', () => {
        it('resets logsRetentionUpdating to false', () => {
          mount({
            logsRetentionUpdating: true,
          });

          LogRetentionLogic.actions.clearLogRetentionUpdating();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logsRetentionUpdating: false,
          });
        });
      });
    });

    describe('updateLogRetention', () => {
      describe('logRetention', () => {
        it('updates the logRetention values that are passed, and defaults the others that are not set', () => {
          mount({
            logRetention: {},
          });

          LogRetentionLogic.actions.updateLogRetention({
            api: { enabled: true },
          });

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logRetention: {
              api: { enabled: true },
              analytics: {}, // This is defaulted to {}
            },
          });
        });

        it('updates the logRetention values that are passed, and retains that values that are already set', () => {
          mount({
            logRetention: {
              api: { enabled: true },
              analytics: { enabled: true },
            },
          });

          LogRetentionLogic.actions.updateLogRetention({
            api: { enabled: false },
          });

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logRetention: {
              api: { enabled: false },
              analytics: { enabled: true },
            },
          });
        });
      });
    });

    describe('saveLogRetention', () => {
      beforeEach(() => {
        mount();
        jest.spyOn(LogRetentionLogic.actions, 'clearLogRetentionUpdating');
      });

      describe('openModal', () => {
        it('should be reset to null', () => {
          mount({
            openModal: ELogRetentionOptions.Analytics,
          });

          LogRetentionLogic.actions.saveLogRetention(ELogRetentionOptions.Analytics, true);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openModal: null,
          });
        });
      });

      it('will call an API endpoint and update log retention', async () => {
        jest.spyOn(LogRetentionLogic.actions, 'updateLogRetention');
        const promise = Promise.resolve({
          analytics: {
            disabled_at: null,
            enabled: true,
            retention_policy: { is_default: true, min_age_days: 180 },
          },
          api: {
            disabled_at: null,
            enabled: true,
            retention_policy: { is_default: true, min_age_days: 180 },
          },
        });
        http.put.mockReturnValue(promise);

        LogRetentionLogic.actions.saveLogRetention(ELogRetentionOptions.Analytics, true);

        expect(http.put).toHaveBeenCalledWith(`/api/app_search/log_settings`, {
          body: JSON.stringify({
            analytics: {
              enabled: true,
            },
          }),
        });

        await promise;
        expect(LogRetentionLogic.actions.updateLogRetention).toHaveBeenCalledWith({
          analytics: {
            disabledAt: null,
            enabled: true,
            retentionPolicy: { isDefault: true, minAgeDays: 180 },
          },
          api: {
            disabledAt: null,
            enabled: true,
            retentionPolicy: { isDefault: true, minAgeDays: 180 },
          },
        });

        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        const promise = Promise.reject('An error occured');
        http.put.mockReturnValue(promise);

        LogRetentionLogic.actions.saveLogRetention(ELogRetentionOptions.Analytics, true);

        try {
          await promise;
        } catch {
          // Do nothing
        }
        expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });
    });

    describe('toggleLogRetention', () => {
      describe('logsRetentionUpdating', () => {
        it('sets logsRetentionUpdating to true', () => {
          mount({
            logsRetentionUpdating: false,
          });

          LogRetentionLogic.actions.toggleLogRetention(ELogRetentionOptions.Analytics);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logsRetentionUpdating: true,
          });
        });
      });

      it('will call setOpenModal if already enabled', () => {
        mount({
          logRetention: {
            [ELogRetentionOptions.Analytics]: {
              enabled: true,
            },
          },
        });
        jest.spyOn(LogRetentionLogic.actions, 'setOpenModal');

        LogRetentionLogic.actions.toggleLogRetention(ELogRetentionOptions.Analytics);

        expect(LogRetentionLogic.actions.setOpenModal).toHaveBeenCalledWith(
          ELogRetentionOptions.Analytics
        );
      });
    });

    it('will call saveLogRetention if NOT already enabled', () => {
      mount({
        logRetention: {
          [ELogRetentionOptions.Analytics]: {
            enabled: false,
          },
        },
      });
      jest.spyOn(LogRetentionLogic.actions, 'saveLogRetention');

      LogRetentionLogic.actions.toggleLogRetention(ELogRetentionOptions.Analytics);

      expect(LogRetentionLogic.actions.saveLogRetention).toHaveBeenCalledWith(
        ELogRetentionOptions.Analytics,
        true
      );
    });

    it('will do nothing if logRetention option is not yet set', () => {
      mount({
        logRetention: {},
      });
      jest.spyOn(LogRetentionLogic.actions, 'saveLogRetention');
      jest.spyOn(LogRetentionLogic.actions, 'setOpenModal');

      LogRetentionLogic.actions.toggleLogRetention(ELogRetentionOptions.API);

      expect(LogRetentionLogic.actions.saveLogRetention).not.toHaveBeenCalled();
      expect(LogRetentionLogic.actions.setOpenModal).not.toHaveBeenCalled();
    });
  });
});
