/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { LogRetentionOptions } from './types';

import { LogRetentionLogic } from '.';

describe('LogRetentionLogic', () => {
  const { mount } = new LogicMounter(LogRetentionLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const TYPICAL_SERVER_LOG_RETENTION = {
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
    audit: {
      disabled_at: null,
      enabled: true,
      retention_policy: { is_default: true, min_age_days: 180 },
    },
    crawler: {
      disabled_at: null,
      enabled: true,
      retention_policy: { is_default: true, min_age_days: 180 },
    },
  };

  const TYPICAL_CLIENT_LOG_RETENTION = {
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
    audit: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
    crawler: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
  };

  const DEFAULT_VALUES = {
    logRetention: null,
    openedModal: null,
    isLogRetentionUpdating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(LogRetentionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setOpenedModal', () => {
      describe('openedModal', () => {
        it('should be set to the provided value', () => {
          mount();

          LogRetentionLogic.actions.setOpenedModal(LogRetentionOptions.Analytics);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openedModal: LogRetentionOptions.Analytics,
          });
        });
      });
    });

    describe('closeModals', () => {
      describe('openedModal', () => {
        it('resets openedModal to null', () => {
          mount({
            openedModal: 'analytics',
          });

          LogRetentionLogic.actions.closeModals();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openedModal: null,
          });
        });
      });

      describe('isLogRetentionUpdating', () => {
        it('resets isLogRetentionUpdating to false', () => {
          mount({
            isLogRetentionUpdating: true,
          });

          LogRetentionLogic.actions.closeModals();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isLogRetentionUpdating: false,
          });
        });
      });
    });

    describe('clearLogRetentionUpdating', () => {
      describe('isLogRetentionUpdating', () => {
        it('resets isLogRetentionUpdating to false', () => {
          mount({
            isLogRetentionUpdating: true,
          });

          LogRetentionLogic.actions.clearLogRetentionUpdating();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isLogRetentionUpdating: false,
          });
        });
      });
    });

    describe('updateLogRetention', () => {
      describe('logRetention', () => {
        it('updates the logRetention values that are passed', () => {
          mount({
            logRetention: {},
          });

          LogRetentionLogic.actions.updateLogRetention({
            api: {
              disabledAt: null,
              enabled: true,
              retentionPolicy: null,
            },
            analytics: {
              disabledAt: null,
              enabled: true,
              retentionPolicy: null,
            },
            audit: {
              disabledAt: null,
              enabled: true,
              retentionPolicy: null,
            },
            crawler: {
              disabledAt: null,
              enabled: true,
              retentionPolicy: null,
            },
          });

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            logRetention: {
              api: {
                disabledAt: null,
                enabled: true,
                retentionPolicy: null,
              },
              analytics: {
                disabledAt: null,
                enabled: true,
                retentionPolicy: null,
              },
              audit: {
                disabledAt: null,
                enabled: true,
                retentionPolicy: null,
              },
              crawler: {
                disabledAt: null,
                enabled: true,
                retentionPolicy: null,
              },
            },
          });
        });
      });
    });
  });

  describe('listeners', () => {
    describe('saveLogRetention', () => {
      beforeEach(() => {
        mount();
        jest.spyOn(LogRetentionLogic.actions, 'clearLogRetentionUpdating');
      });

      describe('openedModal', () => {
        it('should be reset to null', () => {
          mount({
            openedModal: LogRetentionOptions.Analytics,
          });

          LogRetentionLogic.actions.saveLogRetention(LogRetentionOptions.Analytics, true);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openedModal: null,
          });
        });
      });

      it('will call an API endpoint and update log retention', async () => {
        jest.spyOn(LogRetentionLogic.actions, 'updateLogRetention');
        http.put.mockReturnValue(Promise.resolve(TYPICAL_SERVER_LOG_RETENTION));

        LogRetentionLogic.actions.saveLogRetention(LogRetentionOptions.Analytics, true);

        expect(http.put).toHaveBeenCalledWith('/internal/app_search/log_settings', {
          body: JSON.stringify({
            analytics: {
              enabled: true,
            },
          }),
        });

        await nextTick();
        expect(LogRetentionLogic.actions.updateLogRetention).toHaveBeenCalledWith(
          TYPICAL_CLIENT_LOG_RETENTION
        );

        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        http.put.mockReturnValue(Promise.reject('An error occured'));

        LogRetentionLogic.actions.saveLogRetention(LogRetentionOptions.Analytics, true);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });
    });

    describe('toggleLogRetention', () => {
      describe('isLogRetentionUpdating', () => {
        it('sets isLogRetentionUpdating to true', () => {
          mount({
            isLogRetentionUpdating: false,
          });

          LogRetentionLogic.actions.toggleLogRetention(LogRetentionOptions.Analytics);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isLogRetentionUpdating: true,
          });
        });
      });

      it('will call setOpenedModal if already enabled', () => {
        mount({
          logRetention: {
            [LogRetentionOptions.Analytics]: {
              enabled: true,
            },
          },
        });
        jest.spyOn(LogRetentionLogic.actions, 'setOpenedModal');

        LogRetentionLogic.actions.toggleLogRetention(LogRetentionOptions.Analytics);

        expect(LogRetentionLogic.actions.setOpenedModal).toHaveBeenCalledWith(
          LogRetentionOptions.Analytics
        );
      });

      it('will call saveLogRetention if NOT already enabled', () => {
        mount({
          logRetention: {
            [LogRetentionOptions.Analytics]: {
              enabled: false,
            },
          },
        });
        jest.spyOn(LogRetentionLogic.actions, 'saveLogRetention');

        LogRetentionLogic.actions.toggleLogRetention(LogRetentionOptions.Analytics);

        expect(LogRetentionLogic.actions.saveLogRetention).toHaveBeenCalledWith(
          LogRetentionOptions.Analytics,
          true
        );
      });

      it('will do nothing if logRetention option is not yet set', () => {
        mount({
          logRetention: {},
        });
        jest.spyOn(LogRetentionLogic.actions, 'saveLogRetention');
        jest.spyOn(LogRetentionLogic.actions, 'setOpenedModal');

        LogRetentionLogic.actions.toggleLogRetention(LogRetentionOptions.API);

        expect(LogRetentionLogic.actions.saveLogRetention).not.toHaveBeenCalled();
        expect(LogRetentionLogic.actions.setOpenedModal).not.toHaveBeenCalled();
      });
    });

    describe('fetchLogRetention', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      describe('isLogRetentionUpdating', () => {
        it('sets isLogRetentionUpdating to true', () => {
          mount({
            isLogRetentionUpdating: false,
          });

          LogRetentionLogic.actions.fetchLogRetention();

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isLogRetentionUpdating: true,
          });
        });
      });

      it('will call an API endpoint and update log retention', async () => {
        mount();
        jest.spyOn(LogRetentionLogic.actions, 'clearLogRetentionUpdating');
        jest
          .spyOn(LogRetentionLogic.actions, 'updateLogRetention')
          .mockImplementationOnce(() => {});

        http.get.mockReturnValue(Promise.resolve(TYPICAL_SERVER_LOG_RETENTION));

        LogRetentionLogic.actions.fetchLogRetention();
        jest.runAllTimers();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/log_settings');
        expect(LogRetentionLogic.actions.updateLogRetention).toHaveBeenCalledWith(
          TYPICAL_CLIENT_LOG_RETENTION
        );
        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        mount();
        jest.spyOn(LogRetentionLogic.actions, 'clearLogRetentionUpdating');
        http.get.mockReturnValue(Promise.reject('An error occured'));

        LogRetentionLogic.actions.fetchLogRetention();
        jest.runAllTimers();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
        expect(LogRetentionLogic.actions.clearLogRetentionUpdating).toHaveBeenCalled();
      });
    });
  });
});
