/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

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
  });
});
